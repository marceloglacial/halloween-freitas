import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db";
import {
  contestPhotoPreviewUrl,
  type ContestPhotoFormat,
} from "@/lib/contestant-photos";

export async function getCategoryResults(
  eventId: string,
  categoryId: string,
  roundId: string,
): Promise<Results> {
  const eventObjectId = new ObjectId(eventId);
  const categoryObjectId = new ObjectId(categoryId);
  const roundObjectId = new ObjectId(roundId);
  const db = await getDb();
  const category = await db
    .collection<{ eligibility?: Category["eligibility"] }>("categories")
    .findOne(
      { _id: categoryObjectId, eventId: eventObjectId },
      { projection: { eligibility: 1 } },
    );
  if (!category) return { users: [], totalVotes: 0 };

  const contestants = await db
    .collection<{
      _id: ObjectId;
      eventId: ObjectId;
      categoryId: ObjectId;
      entryType: ContestantEntryType;
      displayName: string;
      createdAt: Date;
      status: ContestantEntryStatus;
      contestPhoto?: {
        publicId: string;
        format: ContestPhotoFormat;
      };
    }>("contestants")
    .find({
      eventId: eventObjectId,
      status: "locked",
      ...(category.eligibility === "group"
        ? { categoryId: categoryObjectId, entryType: "group" }
        : {
            $or: [
              { categoryId: categoryObjectId },
              { entryType: "individual" },
            ],
          }),
    })
    .toArray();

  if (!contestants.length) return { users: [], totalVotes: 0 };

  const counts = await db
    .collection("votes")
    .aggregate<{ _id: ObjectId; votes: number }>([
      {
        $match: {
          eventId: eventObjectId,
          roundId: roundObjectId,
          categoryId: categoryObjectId,
          candidateId: { $in: contestants.map((contestant) => contestant._id) },
        },
      },
      { $group: { _id: "$candidateId", votes: { $sum: 1 } } },
    ])
    .toArray();
  const votesByCandidate = new Map(
    counts.map((count) => [count._id.toString(), count.votes]),
  );
  const rows = contestants
    .map((contestant) => ({
      _id: contestant._id.toString(),
      eventId: contestant.eventId.toString(),
      fullName: contestant.displayName,
      createdAt: contestant.createdAt,
      contestPhoto: contestant.contestPhoto,
      votes: votesByCandidate.get(contestant._id.toString()) ?? 0,
    }))
    .sort(
      (a, b) =>
        b.votes - a.votes ||
        a.createdAt.getTime() - b.createdAt.getTime() ||
        (a.fullName < b.fullName ? -1 : a.fullName > b.fullName ? 1 : 0),
      // Registration time breaks vote ties; name is the deterministic fallback.
    );

  return {
    users: rows.map(({ contestPhoto, ...candidate }) => ({
      ...candidate,
      imageUrl: contestPhoto
        ? contestPhotoPreviewUrl(contestPhoto.publicId, contestPhoto.format)
        : null,
    })),
    totalVotes: rows.reduce((total, row) => total + row.votes, 0),
  };
}
