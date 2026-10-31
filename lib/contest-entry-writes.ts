import { ObjectId, type ClientSession, type Db } from "mongodb";

export class ContestEntryClosedError extends Error {
  constructor() {
    super("CONTEST_ENTRY_CLOSED");
  }
}

export function contestEntryWriteFilter(eventId: ObjectId, now: Date) {
  return {
    _id: eventId,
    status: "active",
    votingStatus: "not_started",
    $and: [
      {
        $or: [
          { contestEntryStatus: "open" },
          { contestEntryStatus: { $exists: false } },
        ],
      },
      {
        $or: [
          { registrationStartsAt: { $lte: now } },
          {
            registrationStartsAt: { $exists: false },
            registrationOpensAt: { $lte: now },
          },
        ],
      },
    ],
  };
}

export async function claimContestEntryWrite(
  db: Db,
  eventId: ObjectId,
  session: ClientSession,
  now: Date,
) {
  const result = await db.collection("events").updateOne(
    contestEntryWriteFilter(eventId, now),
    {
      $inc: { contestEntryMutationVersion: 1 },
      $set: { updatedAt: now },
    },
    { session },
  );

  if (!result.matchedCount) throw new ContestEntryClosedError();
}
