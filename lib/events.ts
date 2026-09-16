import { ObjectId } from "mongodb";
import { formatInTimeZone } from "date-fns-tz";
import { getDb } from "@/lib/db";

type EventDocument = Omit<
  HalloweenEvent,
  | "_id"
  | "startsAt"
  | "registrationOpensAt"
  | "registrationClosesAt"
  | "votingOpensAt"
  | "votingClosesAt"
  | "resultsPublishedAt"
> & {
  _id: ObjectId;
  startsAt: Date;
  registrationOpensAt: Date;
  registrationClosesAt: Date;
  votingOpensAt: Date;
  votingClosesAt: Date;
  resultsPublishedAt: Date;
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
    votingOpensAt: new Date(event.votingOpensAt).toISOString(),
    votingClosesAt: new Date(event.votingClosesAt).toISOString(),
    resultsPublishedAt: new Date(event.resultsPublishedAt).toISOString(),
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
  const time = now.getTime();
  if (time < new Date(event.registrationOpensAt).getTime()) return "upcoming";
  if (time < new Date(event.registrationClosesAt).getTime())
    return "registration";
  if (time < new Date(event.votingOpensAt).getTime()) return "upcoming";
  if (time < new Date(event.votingClosesAt).getTime()) return "voting";
  if (time < new Date(event.resultsPublishedAt).getTime())
    return "awaiting-results";
  return "results";
}

export function resultsArePublic(event: HalloweenEvent, now = new Date()) {
  const phase = getEventPhase(event, now);
  return phase === "results" || phase === "archived";
}
