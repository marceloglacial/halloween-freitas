import { ObjectId, type Db } from "mongodb";
import { getDb } from "@/lib/db";
import { parseObjectId } from "@/lib/http";

export type VotingRoundType = "primary" | "runoff";
export type VotingRoundStatus = "open" | "ended";

export type VotingRoundDocument = {
  _id: ObjectId;
  eventId: ObjectId;
  type: VotingRoundType;
  status: VotingRoundStatus;
  categoryIds: ObjectId[];
  openedAt: Date;
  endedAt?: Date;
  reopenedAt?: Date;
};

export type BallotDocument = {
  _id?: ObjectId;
  eventId: ObjectId;
  roundId: ObjectId;
  categoryId: ObjectId;
  voterRsvpId: ObjectId;
  candidateId: ObjectId;
  votedAt: Date;
};

export async function getOpenVotingRound(
  eventId: string,
  db?: Db,
): Promise<VotingRoundDocument | null> {
  const eventObjectId = parseObjectId(eventId);
  if (!eventObjectId) return null;
  return await (db ?? (await getDb()))
    .collection<VotingRoundDocument>("votingRounds")
    .findOne({ eventId: eventObjectId, status: "open" });
}

export async function getFinalVotingRound(
  eventId: string,
  db?: Db,
): Promise<VotingRoundDocument | null> {
  const eventObjectId = parseObjectId(eventId);
  if (!eventObjectId) return null;
  const database = db ?? (await getDb());
  const rounds = await database
    .collection<VotingRoundDocument>("votingRounds")
    .find({ eventId: eventObjectId, status: "ended" })
    .sort({ endedAt: -1, openedAt: -1, _id: -1 })
    .limit(1)
    .toArray();
  return rounds[0] ?? null;
}

export async function hasVotedInRoundCategory(
  eventId: string,
  roundId: ObjectId,
  voterRsvpId: string,
  categoryId: string,
  db?: Db,
): Promise<boolean> {
  const eventObjectId = parseObjectId(eventId);
  const voterObjectId = parseObjectId(voterRsvpId);
  const categoryObjectId = parseObjectId(categoryId);
  if (!eventObjectId || !voterObjectId || !categoryObjectId) return false;
  return Boolean(
    await (db ?? (await getDb())).collection("votes").findOne(
      {
        eventId: eventObjectId,
        roundId,
        voterRsvpId: voterObjectId,
        categoryId: categoryObjectId,
      },
      { projection: { _id: 1 } },
    ),
  );
}

export function roundIncludesCategory(
  round: Pick<VotingRoundDocument, "eventId" | "categoryIds">,
  eventId: string,
  categoryId: string,
) {
  return (
    round.eventId.toString() === eventId &&
    round.categoryIds.some((id) => id.toString() === categoryId)
  );
}
