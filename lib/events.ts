import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db";
export { getRegistrationState } from "@/util/registration-state";

type EventDocument = Omit<
  HalloweenEvent,
  | "_id"
  | "registrationStartsAt"
  | "eventStartsAt"
  | "startsAt"
  | "registrationOpensAt"
  | "contestEntryStatus"
  | "votingStatus"
  | "resultsPublished"
> & {
  _id: ObjectId;
  registrationStartsAt?: Date;
  eventStartsAt?: Date;
  /** Legacy event date fields remain readable until existing data is migrated. */
  startsAt?: Date;
  registrationOpensAt?: Date;
  contestEntryStatus?: ContestEntryStatus;
  votingStatus?: VotingStatus;
  resultsPublished?: boolean;
};

function serializeEvent(event: EventDocument): HalloweenEvent {
  const registrationStartsAt =
    event.registrationStartsAt ?? event.registrationOpensAt;
  const eventStartsAt = event.eventStartsAt ?? event.startsAt;

  if (!registrationStartsAt || !eventStartsAt) {
    throw new Error(`Event ${event._id.toString()} is missing schedule dates`);
  }

  return {
    _id: event._id.toString(),
    year: event.year,
    slug: event.slug,
    title: event.title,
    timezone: event.timezone,
    registrationStartsAt: new Date(registrationStartsAt).toISOString(),
    eventStartsAt: new Date(eventStartsAt).toISOString(),
    contestEntryStatus:
      event.contestEntryStatus === "closed" ? "closed" : "open",
    votingStatus:
      event.votingStatus === "open" || event.votingStatus === "ended"
        ? event.votingStatus
        : "not_started",
    resultsPublished: event.resultsPublished === true,
    status: event.status,
  };
}

export async function getCurrentEvent(): Promise<HalloweenEvent | null> {
  const db = await getDb();
  const active = await db
    .collection<EventDocument>("events")
    .findOne({ status: "active" }, { sort: { year: -1, _id: 1 } });
  if (active) return serializeEvent(active);

  const latest = await db
    .collection<EventDocument>("events")
    .findOne({}, { sort: { year: -1, _id: 1 } });
  return latest ? serializeEvent(latest) : null;
}

/** Returns the active edition only; unlike getCurrentEvent, this has no historical fallback. */
export async function getActiveEvent(): Promise<HalloweenEvent | null> {
  const db = await getDb();
  const active = await db
    .collection<EventDocument>("events")
    .findOne({ status: "active" }, { sort: { year: -1, _id: 1 } });
  return active ? serializeEvent(active) : null;
}

export async function getEventBySlug(
  slug: string,
): Promise<HalloweenEvent | null> {
  const db = await getDb();
  const event = await db.collection<EventDocument>("events").findOne({ slug });
  return event ? serializeEvent(event) : null;
}

export async function getEventById(id: string): Promise<HalloweenEvent | null> {
  if (!ObjectId.isValid(id)) return null;
  const db = await getDb();
  const event = await db
    .collection<EventDocument>("events")
    .findOne({ _id: new ObjectId(id) });
  return event ? serializeEvent(event) : null;
}

export async function getEvents(): Promise<HalloweenEvent[]> {
  const db = await getDb();
  const events = await db
    .collection<EventDocument>("events")
    .find({})
    .sort({ year: -1, _id: 1 })
    .toArray();
  return events.map(serializeEvent);
}

export function getEventPhase(
  event: HalloweenEvent,
  now = new Date(),
): EventPhase {
  if (event.status === "archived") return "archived";
  if (resultsArePublic(event)) return "results";
  if (event.votingStatus === "open") return "voting";
  if (event.votingStatus === "ended") return "awaiting-results";
  const time = now.getTime();
  if (time < new Date(event.registrationStartsAt).getTime()) return "upcoming";
  return "registration";
}

export function isVotingOpen(event: HalloweenEvent) {
  return event.status === "active" && event.votingStatus === "open";
}

export function resultsArePublic(event: HalloweenEvent) {
  return event.votingStatus === "ended" && event.resultsPublished;
}
