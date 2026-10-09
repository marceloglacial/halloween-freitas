import { ObjectId, type ClientSession, type Db } from "mongodb";
import { getDb } from "@/lib/db";
import { normalizeName, parseObjectId } from "@/lib/http";
import { contestPhotoPreviewUrl } from "@/lib/contestant-photos";
import {
  entryCanVoteForCategory,
  isCompleteContestantEntry,
} from "@/lib/contestant-entry-freeze";
import type { ContestPhotoAsset } from "@/lib/contestant-photos";

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
  contestPhoto?: ContestPhotoAsset;
  createdAt: Date;
  updatedAt: Date;
};

export type OwnedContestantEntry = {
  _id: string;
  categoryId: string;
  entryType: ContestantEntryType;
  displayName: string;
  status: ContestantEntryStatus;
  contestPhoto?: ContestPhotoAsset;
};

export type VotingCandidate = {
  _id: string;
  eventId: string;
  fullName: string;
  imageUrl: string;
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

export async function getContestantEntriesForRsvp(
  eventId: string,
  rsvpId: string,
): Promise<OwnedContestantEntry[]> {
  const db = await getDb();
  const entries = await db
    .collection<ContestantEntryDocument>("contestants")
    .find(contestantEntriesForRsvpQuery(eventId, rsvpId), {
      projection: {
        _id: 1,
        categoryId: 1,
        entryType: 1,
        displayName: 1,
        status: 1,
        contestPhoto: 1,
      },
    })
    .sort({ createdAt: 1, _id: 1 })
    .toArray();

  return entries.map((entry) => ({
    _id: entry._id.toString(),
    categoryId: entry.categoryId.toString(),
    entryType: entry.entryType,
    displayName: entry.displayName,
    status: entry.status,
    ...(entry.contestPhoto ? { contestPhoto: entry.contestPhoto } : {}),
  }));
}

export async function getVotingCandidatesForCategory(
  eventId: string,
  category: Category,
  voterRsvpId: string,
): Promise<VotingCandidate[]> {
  const eventObjectId = parseObjectId(eventId);
  const categoryObjectId = parseObjectId(category._id);
  const voterObjectId = parseObjectId(voterRsvpId);
  if (
    !eventObjectId ||
    !categoryObjectId ||
    !voterObjectId ||
    category.eventId !== eventId
  ) {
    throw new Error("INVALID_VOTING_CANDIDATE_QUERY");
  }

  const db = await getDb();
  const categoryDocument = await db
    .collection<{
      _id: ObjectId;
      eventId: ObjectId;
      eligibility?: Category["eligibility"];
    }>("categories")
    .findOne({ _id: categoryObjectId, eventId: eventObjectId });
  if (!categoryDocument) return [];
  const entries = await db
    .collection<ContestantEntryDocument>("contestants")
    .find({
      eventId: eventObjectId,
      categoryId: categoryObjectId,
      status: "locked",
    })
    .sort({ displayName: 1, _id: 1 })
    .toArray();
  const categoryEligibility = categoryDocument.eligibility ?? "all";
  const eligibilityByCategory = new Map([
    [categoryObjectId.toString(), categoryEligibility],
  ]);

  return entries
    .filter(
      (entry) =>
        entry.status === "locked" &&
        isCompleteContestantEntry(entry, eligibilityByCategory) &&
        entryCanVoteForCategory(entry, { ...category, eventId }, voterObjectId),
    )
    .map((entry) => {
      const serialized = serializePublicContestantEntry(entry);
      if (!serialized || !entry.contestPhoto) {
        throw new Error("INCOMPLETE_LOCKED_CONTESTANT");
      }
      return {
        _id: serialized._id,
        eventId: serialized.eventId,
        fullName: serialized.displayName,
        imageUrl: contestPhotoPreviewUrl(
          entry.contestPhoto.publicId,
          entry.contestPhoto.format,
        ),
      };
    });
}

export async function getContestantEntryForVote(
  eventId: string,
  entryId: string,
  category: Category,
  voterRsvpId: string,
) {
  const eventObjectId = parseObjectId(eventId);
  const entryObjectId = parseObjectId(entryId);
  const categoryObjectId = parseObjectId(category._id);
  const voterObjectId = parseObjectId(voterRsvpId);
  if (
    !eventObjectId ||
    !entryObjectId ||
    !categoryObjectId ||
    !voterObjectId ||
    category.eventId !== eventId
  ) {
    return null;
  }

  const db = await getDb();
  const entry = await db
    .collection<ContestantEntryDocument>("contestants")
    .findOne({
      _id: entryObjectId,
      eventId: eventObjectId,
      categoryId: categoryObjectId,
      status: "locked",
    });
  if (!entry) return null;
  const categoryDocument = await db
    .collection<{
      _id: ObjectId;
      eventId: ObjectId;
      eligibility?: Category["eligibility"];
    }>("categories")
    .findOne({ _id: categoryObjectId, eventId: eventObjectId });
  if (!categoryDocument) return null;
  const eligibilityByCategory = new Map([
    [categoryObjectId.toString(), categoryDocument.eligibility ?? "all"],
  ]);
  if (
    !isCompleteContestantEntry(entry, eligibilityByCategory) ||
    !entryCanVoteForCategory(entry, { ...category, eventId }, voterObjectId)
  ) {
    return null;
  }
  return entry;
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
  const photo = entry.contestPhoto;
  if (
    entry.status !== "locked" ||
    !photo?.assetId ||
    !photo.publicId ||
    !photo.consentAt ||
    !photo.consentByRsvpId
  ) {
    return null;
  }
  return {
    _id: entry._id.toString(),
    eventId: entry.eventId.toString(),
    categoryId: entry.categoryId.toString(),
    entryType: entry.entryType,
    displayName: entry.displayName,
  };
}
