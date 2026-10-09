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
  const rows = await (
    await getDb()
  )
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
          "candidate.categoryId": categoryObjectId,
          "candidate.status": "locked",
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
