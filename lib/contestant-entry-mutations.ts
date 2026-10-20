import { ObjectId, type Db, type Filter, type MongoClient } from "mongodb";
import {
  createContestantEntry,
  normalizeCostumeTitle,
  requireContestantRsvpInEvent,
  type ContestantEntryDocument,
} from "@/lib/contestant-entries";
import { claimContestEntryWrite } from "@/lib/contest-entry-writes";
import { normalizeName } from "@/lib/http";

export class ContestantEntryWriteError extends Error {
  constructor(
    public status: number,
    public code: string,
  ) {
    super(code);
  }
}

export async function createIndividualContestantEntry(
  client: MongoClient,
  db: Db,
  input: {
    eventId: ObjectId;
    categoryId?: ObjectId;
    rsvpId: ObjectId;
    displayName: string;
    costumeTitle?: string;
    now: Date;
  },
) {
  const session = client.startSession();
  let entry: ContestantEntryDocument | undefined;

  try {
    await session.withTransaction(async () => {
      await claimContestEntryWrite(db, input.eventId, session, input.now);
      await requireContestantRsvpInEvent(
        db,
        input.eventId.toString(),
        input.rsvpId.toString(),
        session,
      );

      const categories = await db
        .collection("categories")
        .find(
          { eventId: input.eventId },
          {
            projection: { _id: 1, eligibility: 1 },
            sort: { order: 1, _id: 1 },
            session,
          },
        )
        .toArray();
      const category = categories.find(
        (candidate) =>
          !candidate.eligibility || candidate.eligibility === "all",
      );
      if (!category) {
        throw new ContestantEntryWriteError(400, "category_not_available");
      }

      entry = createContestantEntry(
        {
          eventId: input.eventId.toString(),
          categoryId: category._id.toString(),
          entryType: "individual",
          rsvpId: input.rsvpId.toString(),
          displayName: input.displayName,
          costumeTitle: input.costumeTitle,
        },
        input.now,
      );
      await db
        .collection<ContestantEntryDocument>("contestants")
        .insertOne(entry, { session });
    });
  } finally {
    await session.endSession();
  }

  if (!entry) throw new Error("CONTESTANT_ENTRY_NOT_CREATED");
  return entry;
}

export async function createJuniorContestantEntry(
  client: MongoClient,
  db: Db,
  input: {
    eventId: ObjectId;
    categoryId?: ObjectId;
    guardianRsvpId: ObjectId;
    childName: string;
    costumeTitle?: string;
    now: Date;
  },
) {
  const session = client.startSession();
  let entry: ContestantEntryDocument | undefined;

  try {
    await session.withTransaction(async () => {
      await claimContestEntryWrite(db, input.eventId, session, input.now);
      await requireContestantRsvpInEvent(
        db,
        input.eventId.toString(),
        input.guardianRsvpId.toString(),
        session,
      );

      const category = await db
        .collection("categories")
        .findOne(
          input.categoryId
            ? { _id: input.categoryId, eventId: input.eventId }
            : { eventId: input.eventId, eligibility: "junior" },
          {
            projection: { _id: 1, eligibility: 1 },
            sort: { order: 1, _id: 1 },
            session,
          },
        );
      if (!category) {
        throw new ContestantEntryWriteError(
          input.categoryId ? 404 : 400,
          input.categoryId ? "category_not_found" : "category_not_available",
        );
      }
      if (category.eligibility !== "junior") {
        throw new ContestantEntryWriteError(400, "category_not_available");
      }

      entry = createContestantEntry(
        {
          eventId: input.eventId.toString(),
          categoryId: category._id.toString(),
          entryType: "junior",
          rsvpId: input.guardianRsvpId.toString(),
          displayName: input.childName,
          costumeTitle: input.costumeTitle,
        },
        input.now,
      );
      await db
        .collection<ContestantEntryDocument>("contestants")
        .insertOne(entry, { session });
    });
  } finally {
    await session.endSession();
  }

  if (!entry) throw new Error("CONTESTANT_ENTRY_NOT_CREATED");
  return entry;
}

export async function createGroupContestantEntry(
  client: MongoClient,
  db: Db,
  input: {
    eventId: ObjectId;
    categoryId?: ObjectId;
    ownerRsvpId: ObjectId;
    groupName: string;
    costumeTitle?: string;
    now: Date;
  },
) {
  const session = client.startSession();
  let entry: ContestantEntryDocument | undefined;

  try {
    await session.withTransaction(async () => {
      await claimContestEntryWrite(db, input.eventId, session, input.now);
      await requireContestantRsvpInEvent(
        db,
        input.eventId.toString(),
        input.ownerRsvpId.toString(),
        session,
      );

      const category = await db
        .collection("categories")
        .findOne(
          input.categoryId
            ? { _id: input.categoryId, eventId: input.eventId }
            : { eventId: input.eventId, eligibility: "group" },
          {
            projection: { _id: 1, eligibility: 1 },
            sort: { order: 1, _id: 1 },
            session,
          },
        );
      if (!category) {
        throw new ContestantEntryWriteError(
          input.categoryId ? 404 : 400,
          input.categoryId ? "category_not_found" : "category_not_available",
        );
      }
      if (category.eligibility !== "group") {
        throw new ContestantEntryWriteError(400, "category_not_available");
      }

      entry = createContestantEntry(
        {
          eventId: input.eventId.toString(),
          categoryId: category._id.toString(),
          entryType: "group",
          rsvpId: input.ownerRsvpId.toString(),
          displayName: input.groupName,
          costumeTitle: input.costumeTitle,
        },
        input.now,
      );
      await db
        .collection<ContestantEntryDocument>("contestants")
        .insertOne(entry, { session });
    });
  } finally {
    await session.endSession();
  }

  if (!entry) throw new Error("CONTESTANT_ENTRY_NOT_CREATED");
  return entry;
}

type UpdateContestantEntryTitleInput = {
  eventId: ObjectId;
  entryId: ObjectId;
  rsvpId: ObjectId;
  costumeTitle?: unknown;
  displayName?: unknown;
  now: Date;
  entryType?: ContestantEntryDocument["entryType"];
};

export async function updateOwnedContestantEntryTitle(
  client: MongoClient,
  db: Db,
  input: UpdateContestantEntryTitleInput,
) {
  const session = client.startSession();
  let costumeTitle: string | undefined;
  let displayName: string | undefined;

  try {
    await session.withTransaction(async () => {
      await claimContestEntryWrite(db, input.eventId, session, input.now);
      const contestants = db.collection<ContestantEntryDocument>("contestants");
      const ownership: Filter<ContestantEntryDocument> = input.entryType
        ? input.entryType === "junior"
          ? {
              _id: input.entryId,
              eventId: input.eventId,
              guardianRsvpId: input.rsvpId,
              entryType: input.entryType,
            }
          : {
              _id: input.entryId,
              eventId: input.eventId,
              ownerRsvpId: input.rsvpId,
              entryType: input.entryType,
            }
        : {
            _id: input.entryId,
            eventId: input.eventId,
            $or: [
              { ownerRsvpId: input.rsvpId },
              { guardianRsvpId: input.rsvpId },
            ],
          };
      const existing = await contestants.findOne(ownership, {
        projection: { _id: 1, status: 1, entryType: 1 },
        session,
      });
      if (!existing)
        throw new ContestantEntryWriteError(404, "entry_not_found");
      if (existing.status === "locked" || existing.status === "withdrawn") {
        throw new ContestantEntryWriteError(409, "entry_not_editable");
      }

      if (Object.hasOwn(input, "costumeTitle")) {
        try {
          costumeTitle = normalizeCostumeTitle(input.costumeTitle);
        } catch {
          throw new ContestantEntryWriteError(400, "invalid_costume_title");
        }
      }
      if (Object.hasOwn(input, "displayName")) {
        if (existing.entryType !== "group") {
          throw new ContestantEntryWriteError(400, "invalid_group_name");
        }
        displayName = normalizeName(input.displayName) ?? undefined;
        if (!displayName) {
          throw new ContestantEntryWriteError(400, "invalid_group_name");
        }
      }

      const set: Partial<ContestantEntryDocument> = { updatedAt: input.now };
      if (displayName) set.displayName = displayName;
      if (Object.hasOwn(input, "costumeTitle") && costumeTitle) {
        set.costumeTitle = costumeTitle;
      }
      const unset =
        Object.hasOwn(input, "costumeTitle") && !costumeTitle
          ? { costumeTitle: "" as const }
          : undefined;
      const result = await contestants.updateOne(
        {
          ...ownership,
          status: { $in: ["draft", "ready"] },
        },
        { $set: set, ...(unset ? { $unset: unset } : {}) },
        { session },
      );
      if (!result.matchedCount) {
        throw new ContestantEntryWriteError(409, "entry_not_editable");
      }
    });
  } finally {
    await session.endSession();
  }

  return { costumeTitle, displayName };
}

export function updateIndividualContestantEntryTitle(
  client: MongoClient,
  db: Db,
  input: Omit<UpdateContestantEntryTitleInput, "entryType" | "displayName">,
) {
  return updateOwnedContestantEntryTitle(client, db, {
    ...input,
    entryType: "individual",
  });
}
