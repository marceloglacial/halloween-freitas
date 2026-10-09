import { ObjectId, type ClientSession, type Db } from "mongodb";
import { normalizeName, parseObjectId } from "@/lib/http";

type ContestantOwnership =
  | { ownerRsvpId: ObjectId; guardianRsvpId?: never }
  | { guardianRsvpId: ObjectId; ownerRsvpId?: never };

export type ContestantEntryDocument = {
  _id: ObjectId;
  eventId: ObjectId;
  categoryId: ObjectId;
  entryType: ContestantEntryType;
  displayName: string;
  status: ContestantEntryStatus;
  ownerRsvpId?: ObjectId;
  guardianRsvpId?: ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export function isContestantEntryType(
  value: unknown,
): value is ContestantEntryType {
  return value === "individual" || value === "junior" || value === "group";
}

export function contestantOwnership(
  entryType: unknown,
  rsvpId: unknown,
): ContestantOwnership {
  if (!isContestantEntryType(entryType)) {
    throw new Error("INVALID_CONTESTANT_ENTRY_TYPE");
  }
  const ownerRsvpId = parseObjectId(rsvpId);
  if (!ownerRsvpId) throw new Error("INVALID_CONTESTANT_OWNER");
  return entryType === "junior"
    ? { guardianRsvpId: ownerRsvpId }
    : { ownerRsvpId };
}

export function createContestantEntry(
  input: {
    eventId: unknown;
    categoryId: unknown;
    entryType: unknown;
    rsvpId: unknown;
    displayName: unknown;
  },
  now = new Date(),
): ContestantEntryDocument {
  const eventId = parseObjectId(input.eventId);
  const categoryId = parseObjectId(input.categoryId);
  const displayName = normalizeName(input.displayName);
  if (
    !eventId ||
    !categoryId ||
    !displayName ||
    !isContestantEntryType(input.entryType)
  ) {
    throw new Error("INVALID_CONTESTANT_ENTRY");
  }

  return {
    _id: new ObjectId(),
    eventId,
    categoryId,
    entryType: input.entryType,
    displayName,
    ...contestantOwnership(input.entryType, input.rsvpId),
    status: "draft",
    createdAt: now,
    updatedAt: now,
  };
}

export function contestantEntriesForRsvpQuery(
  eventId: unknown,
  rsvpId: unknown,
) {
  const eventObjectId = parseObjectId(eventId);
  const rsvpObjectId = parseObjectId(rsvpId);
  if (!eventObjectId || !rsvpObjectId) {
    throw new Error("INVALID_CONTESTANT_OWNERSHIP_QUERY");
  }

  return {
    eventId: eventObjectId,
    $or: [{ ownerRsvpId: rsvpObjectId }, { guardianRsvpId: rsvpObjectId }],
  };
}

export async function requireContestantRsvpInEvent(
  db: Db,
  eventId: unknown,
  rsvpId: unknown,
  session?: ClientSession,
) {
  const eventObjectId = parseObjectId(eventId);
  const rsvpObjectId = parseObjectId(rsvpId);
  if (!eventObjectId || !rsvpObjectId) {
    throw new Error("INVALID_CONTESTANT_OWNERSHIP_REFERENCE");
  }

  const rsvp = await db.collection("users").findOne(
    { _id: rsvpObjectId, eventId: eventObjectId, status: { $ne: "cancelled" } },
    {
      projection: { _id: 1 },
      ...(session ? { session } : {}),
    },
  );
  if (!rsvp) throw new Error("CONTESTANT_RSVP_NOT_FOUND_FOR_EVENT");
  return rsvpObjectId;
}

export function serializePublicContestantEntry(
  entry: ContestantEntryDocument,
): PublicContestantEntry | null {
  if (entry.status !== "ready" && entry.status !== "locked") return null;
  return {
    _id: entry._id.toString(),
    eventId: entry.eventId.toString(),
    categoryId: entry.categoryId.toString(),
    entryType: entry.entryType,
    displayName: entry.displayName,
  };
}
