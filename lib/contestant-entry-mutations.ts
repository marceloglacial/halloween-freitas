import { ObjectId, type Db, type Filter, type MongoClient } from "mongodb";
import {
  createContestantEntry,
  normalizeCostumeTitle,
  requireContestantRsvpInEvent,
  type ContestantEntryDocument,
} from "@/lib/contestant-entries";
import { claimContestEntryWrite } from "@/lib/contest-entry-writes";

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
    categoryId: ObjectId;
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

      const category = await db
        .collection("categories")
        .findOne(
          { _id: input.categoryId, eventId: input.eventId },
          { projection: { _id: 1, eligibility: 1 }, session },
        );
      if (!category)
        throw new ContestantEntryWriteError(404, "category_not_found");
      if (category.eligibility && category.eligibility !== "all") {
        throw new ContestantEntryWriteError(400, "category_not_available");
      }

      entry = createContestantEntry(
        {
          eventId: input.eventId.toString(),
          categoryId: input.categoryId.toString(),
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

export async function updateIndividualContestantEntryTitle(
  client: MongoClient,
  db: Db,
  input: {
    eventId: ObjectId;
    entryId: ObjectId;
    rsvpId: ObjectId;
    costumeTitle: unknown;
    now: Date;
  },
) {
  const session = client.startSession();
  let costumeTitle: string | undefined;

  try {
    await session.withTransaction(async () => {
      await claimContestEntryWrite(db, input.eventId, session, input.now);
      const contestants = db.collection<ContestantEntryDocument>("contestants");
      const ownership: Filter<ContestantEntryDocument> = {
        _id: input.entryId,
        eventId: input.eventId,
        ownerRsvpId: input.rsvpId,
        entryType: "individual",
      };
      const existing = await contestants.findOne(ownership, {
        projection: { _id: 1, status: 1 },
        session,
      });
      if (!existing)
        throw new ContestantEntryWriteError(404, "entry_not_found");
      if (existing.status === "locked" || existing.status === "withdrawn") {
        throw new ContestantEntryWriteError(409, "entry_not_editable");
      }

      try {
        costumeTitle = normalizeCostumeTitle(input.costumeTitle);
      } catch {
        throw new ContestantEntryWriteError(400, "invalid_costume_title");
      }
      const result = await contestants.updateOne(
        {
          ...ownership,
          status: { $in: ["draft", "ready"] },
        },
        {
          ...(costumeTitle
            ? { $set: { costumeTitle, updatedAt: input.now } }
            : { $unset: { costumeTitle: "" }, $set: { updatedAt: input.now } }),
        },
        { session },
      );
      if (!result.matchedCount) {
        throw new ContestantEntryWriteError(409, "entry_not_editable");
      }
    });
  } finally {
    await session.endSession();
  }

  return { costumeTitle };
}
