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
  const category = await db.collection<{ eligibility?: Category["eligibility"] }>("categories").findOne(
    { _id: categoryObjectId, eventId: eventObjectId },
    { projection: { eligibility: 1 } },
  );
  if (!category) return { users: [], totalVotes: 0 };

  const rows = await db
    .collection("votes")
    .aggregate<{
      _id: string;
      eventId: string;
      fullName: string;
      contestPhoto?: { publicId: string; format: ContestPhotoFormat };
      votes: number;
    }>([
      {
        $match: {
          eventId: eventObjectId,
          roundId: roundObjectId,
          categoryId: categoryObjectId,
        },
      },
      { $group: { _id: "$candidateId", votes: { $sum: 1 } } },
      {
        $lookup: {
          from: "contestants",
          localField: "_id",
          foreignField: "_id",
          as: "candidate",
        },
      },
      { $unwind: "$candidate" },
      {
        $match: {
          "candidate.eventId": eventObjectId,
          "candidate.status": "locked",
          ...(category.eligibility === "group"
            ? {
                "candidate.categoryId": categoryObjectId,
                "candidate.entryType": "group",
              }
            : category.eligibility === "junior"
              ? {
                  "candidate.categoryId": categoryObjectId,
                  "candidate.entryType": "junior",
                }
              : {
                  $or: [
                    { "candidate.categoryId": categoryObjectId },
                    { "candidate.entryType": "individual" },
                  ],
                }),
        },
      },
      {
        $project: {
          _id: { $toString: "$candidate._id" },
          eventId: { $toString: "$candidate.eventId" },
          fullName: "$candidate.displayName",
          contestPhoto: "$candidate.contestPhoto",
          votes: 1,
        },
      },
      { $sort: { votes: -1, fullName: 1 } },
    ])
    .toArray();
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
