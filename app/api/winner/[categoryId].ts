import type { NextApiRequest, NextApiResponse } from "next";
import { MongoClient, ObjectId } from "mongodb";

const client = new MongoClient(process.env.DATABASE_URL!);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    const { categoryId } = req.query;
    if (!categoryId || typeof categoryId !== "string") {
      return res.status(400).json({ error: "Invalid categoryId" });
    }

    await client.connect();
    const db = client.db(process.env.DATABASE_NAME);

    const categoryObjectId = new ObjectId(categoryId);

    // 1. Aggregate votes per user in this category
    const voteCounts = await db
      .collection("votes")
      .aggregate([
        { $match: { categoryId: categoryObjectId } },
        { $group: { _id: "$voteForId", voteCount: { $sum: 1 } } },
        { $sort: { voteCount: -1 } },
      ])
      .toArray();

    if (voteCounts.length === 0) {
      return res.status(200).json({ message: "No votes yet in this category" });
    }

    // 2. Find users with max votes (handle tie)
    const maxVotes = voteCounts[0].voteCount;
    const topUserIds = voteCounts
      .filter((v) => v.voteCount === maxVotes)
      .map((v) => v._id);

    // 3. Get their creation dates and pick the earliest
    const topUsers = await db
      .collection("users")
      .find({ _id: { $in: topUserIds } })
      .sort({ createdAt: 1 }) // earliest created first
      .toArray();

    const winnerUser = topUsers[0];

    return res.status(200).json({
      categoryId,
      winnerId: winnerUser._id,
      winnerName: winnerUser.fullName,
      votes: maxVotes,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  } finally {
    await client.close();
  }
}
