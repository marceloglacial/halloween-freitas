import { ObjectId, type ClientSession, type Db, type Filter } from "mongodb";
import { getDb } from "@/lib/db";
import { normalizeName, parseObjectId } from "@/lib/http";
import { contestPhotoPreviewUrl } from "@/lib/contestant-photos";
import {
  entryCanVoteForCategory,
  isCompleteContestantEntry,
} from "@/lib/contestant-entry-freeze";
import type { ContestPhotoAsset } from "@/lib/contestant-photos";

type ContestantOwnership = { ownerRsvpId: ObjectId };

export type ContestantEntryDocument = {
  _id: ObjectId;
  eventId: ObjectId;
  categoryId: ObjectId;
  entryType: ContestantEntryType;
  displayName: string;
  costumeTitle?: string;
  status: ContestantEntryStatus;
  ownerRsvpId?: ObjectId;
  contestPhoto?: ContestPhotoAsset;
  createdAt: Date;
  updatedAt: Date;
};

export type OwnedContestantEntry = {
  _id: string;
  categoryId: string;
  entryType: ContestantEntryType;
  displayName: string;
  costumeTitle?: string;
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
  return value === "individual" || value === "group";
}

export function normalizeCostumeTitle(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") throw new Error("INVALID_COSTUME_TITLE");
  const title = value.trim().replace(/\s+/g, " ");
  if (!title) return undefined;
  if (title.length > 100) throw new Error("INVALID_COSTUME_TITLE");
  return title;
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
  return { ownerRsvpId };
}

export function createContestantEntry(
  input: {
    eventId: unknown;
    categoryId: unknown;
    entryType: unknown;
    rsvpId: unknown;
    displayName: unknown;
    costumeTitle?: unknown;
  },
  now = new Date(),
): ContestantEntryDocument {
  const eventId = parseObjectId(input.eventId);
  const categoryId = parseObjectId(input.categoryId);
  const displayName = normalizeName(input.displayName);
  let costumeTitle: string | undefined;
  try {
    costumeTitle = normalizeCostumeTitle(input.costumeTitle);
  } catch {
    throw new Error("INVALID_CONTESTANT_ENTRY");
  }
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
    ...(costumeTitle ? { costumeTitle } : {}),
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
    ownerRsvpId: rsvpObjectId,
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
        costumeTitle: 1,
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
    ...(entry.costumeTitle ? { costumeTitle: entry.costumeTitle } : {}),
    status: entry.status,
    ...(entry.contestPhoto ? { contestPhoto: entry.contestPhoto } : {}),
  }));
}

export async function getAdminParticipantRsvpIdsForEvent(
  eventId: string,
): Promise<string[]> {
  const eventObjectId = parseObjectId(eventId);
  if (!eventObjectId) throw new Error("INVALID_CONTESTANT_EVENT_QUERY");

  const entries = await (
    await getDb()
  )
    .collection<ContestantEntryDocument>("contestants")
    .find(
      { eventId: eventObjectId },
      { projection: { ownerRsvpId: 1, status: 1, contestPhoto: 1 } },
    )
    .toArray();

  return [
    ...new Set(
      entries
        .filter((entry) => isAdminParticipantEntry(entry, eventObjectId))
        .map((entry) => entry.ownerRsvpId!.toString()),
    ),
  ];
}

export async function getAdminGroupEntriesForEvent(
  eventId: string,
  participantsOnly = false,
): Promise<
  Array<{
    ownerRsvpId: string;
    displayName: string;
    status: ContestantEntryStatus;
  }>
> {
  const eventObjectId = parseObjectId(eventId);
  if (!eventObjectId) throw new Error("INVALID_CONTESTANT_EVENT_QUERY");

  const entries = await (
    await getDb()
  )
    .collection<ContestantEntryDocument>("contestants")
    .find({
      eventId: eventObjectId,
      entryType: "group",
      status: { $ne: "withdrawn" },
    })
    .toArray();

  return entries
    .filter(
      (entry) =>
        entry.ownerRsvpId &&
        (!participantsOnly || isAdminParticipantEntry(entry, eventObjectId)),
    )
    .map((entry) => ({
      ownerRsvpId: entry.ownerRsvpId!.toString(),
      displayName: entry.displayName,
      status: entry.status,
    }));
}

function isAdminParticipantEntry(
  entry: ContestantEntryDocument,
  eventId: ObjectId,
) {
  const photo = entry.contestPhoto;
  return Boolean(
    entry.status !== "withdrawn" &&
    entry.ownerRsvpId &&
    photo?.assetId &&
    photo.publicId?.startsWith(`contest-photos/${eventId}/`) &&
    photo.consentAt instanceof Date &&
    photo.consentByRsvpId === entry.ownerRsvpId.toString(),
  );
}

export async function getVotingCandidatesForCategory(
  eventId: string,
  category: Category,
  voterRsvpId: string,
  allowedCandidateIds?: ObjectId[],
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
  if (allowedCandidateIds?.length === 0) return [];
  const entryQuery: Filter<ContestantEntryDocument> = {
    eventId: eventObjectId,
    $or: [{ categoryId: categoryObjectId }, { entryType: "individual" }],
    status: "locked",
    ...(allowedCandidateIds ? { _id: { $in: allowedCandidateIds } } : {}),
  };
  const entries = await db
    .collection<ContestantEntryDocument>("contestants")
    .find(entryQuery)
    .sort({ displayName: 1, _id: 1 })
    .toArray();
  const categoryEligibility = categoryDocument.eligibility ?? "all";
  const eligibilityByCategory = new Map([
    [categoryObjectId.toString(), categoryEligibility],
    ...entries
      .filter((entry) => entry.entryType === "individual")
      .map((entry) => [entry.categoryId.toString(), "all" as const] as const),
  ]);

  return entries
    .filter(
      (entry) =>
        entry.status === "locked" &&
        isCompleteContestantEntry(entry, eligibilityByCategory) &&
        entryCanVoteForCategory(entry, { ...category, eventId }),
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
      status: "locked",
      $or: [{ categoryId: categoryObjectId }, { entryType: "individual" }],
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
    ...(entry.entryType === "individual"
      ? [[entry.categoryId.toString(), "all" as const] as const]
      : []),
  ]);
  if (
    !isCompleteContestantEntry(entry, eligibilityByCategory) ||
    !entryCanVoteForCategory(entry, { ...category, eventId })
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
