import { ObjectId } from "mongodb";
import { formatInTimeZone } from "date-fns-tz";
import { getDb } from "@/lib/db";

type EventDocument = Omit<
  HalloweenEvent,
  | "_id"
  | "startsAt"
  | "registrationOpensAt"
  | "registrationClosesAt"
  | "votingStatus"
  | "resultsPublished"
> & {
  _id: ObjectId;
  startsAt: Date;
  registrationOpensAt: Date;
  registrationClosesAt: Date;
  votingStatus?: VotingStatus;
  resultsPublished?: boolean;
};

function serializeEvent(event: EventDocument): HalloweenEvent {
  return {
    _id: event._id.toString(),
    year:
      event.year ??
      Number(formatInTimeZone(event.startsAt, event.timezone, "yyyy")),
    slug: event.slug,
    title: event.title,
    timezone: event.timezone,
    startsAt: new Date(event.startsAt).toISOString(),
    registrationOpensAt: new Date(event.registrationOpensAt).toISOString(),
    registrationClosesAt: new Date(event.registrationClosesAt).toISOString(),
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
    .findOne({ status: "active" }, { sort: { startsAt: -1 } });
  if (active) return serializeEvent(active);

  const latest = await db
    .collection<EventDocument>("events")
    .findOne({}, { sort: { startsAt: -1 } });
  return latest ? serializeEvent(latest) : null;
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
    .sort({ startsAt: -1 })
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
  if (time < new Date(event.registrationOpensAt).getTime()) return "upcoming";
  if (time < new Date(event.registrationClosesAt).getTime())
    return "registration";
  return "upcoming";
}

export function getRegistrationState(
  event: HalloweenEvent,
  now = new Date(),
): RegistrationState {
  if (event.status !== "active") return "closed";
  const time = now.getTime();
  if (time < new Date(event.registrationOpensAt).getTime()) return "upcoming";
  if (time >= new Date(event.registrationClosesAt).getTime()) return "closed";
  return "open";
}

export function isVotingOpen(event: HalloweenEvent) {
  return event.status === "active" && event.votingStatus === "open";
}

export function resultsArePublic(event: HalloweenEvent) {
  return event.votingStatus === "ended" && event.resultsPublished;
}
