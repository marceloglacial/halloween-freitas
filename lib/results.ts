import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db";

export async function getCategoryResults(
  eventId: string,
  categoryId: string,
): Promise<Results> {
  const rows = await (
    await getDb()
  )
    .collection("votes")
    .aggregate<UserWithVotes>([
      {
        $match: {
          eventId: new ObjectId(eventId),
          categoryId: new ObjectId(categoryId),
        },
      },
      { $group: { _id: "$voteForId", votes: { $sum: 1 } } },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $project: {
          _id: { $toString: "$user._id" },
          eventId: { $toString: "$user.eventId" },
          fullName: "$user.fullName",
          imageUrl: "$user.imageUrl",
          group: "$user.group",
          junior: "$user.junior",
          votes: 1,
        },
      },
      { $sort: { votes: -1, fullName: 1 } },
    ])
    .toArray();
  return {
    users: rows,
    totalVotes: rows.reduce((total, row) => total + row.votes, 0),
  };
}
