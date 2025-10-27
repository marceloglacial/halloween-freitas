import type { NextApiRequest, NextApiResponse } from "next";
import { MongoClient, ObjectId } from "mongodb";

const client = new MongoClient(process.env.DATABASE_URL!);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { voterId, voteForId, categoryId } = req.body;

    if (!voterId || !voteForId || !categoryId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (voterId === voteForId) {
      return res.status(400).json({ error: "You cannot vote for yourself" });
    }

    await client.connect();
    const db = client.db(process.env.DATABASE_NAME);

    const voterObjectId = new ObjectId(voterId);
    const voteForObjectId = new ObjectId(voteForId);
    const categoryObjectId = new ObjectId(categoryId);

    // Check if voter exists
    const voter = await db.collection("users").findOne({ _id: voterObjectId });
    if (!voter) return res.status(404).json({ error: "Voter not found" });

    // Check if vote target exists
    const voteForUser = await db
      .collection("users")
      .findOne({ _id: voteForObjectId });
    if (!voteForUser)
      return res.status(404).json({ error: "User to vote for not found" });

    // Check if voter already voted in this category
    const existingVote = await db.collection("votes").findOne({
      voterId: voterObjectId,
      categoryId: categoryObjectId,
    });

    if (existingVote) {
      return res
        .status(400)
        .json({ error: "You have already voted in this category" });
    }

    // Insert the vote
    await db.collection("votes").insertOne({
      voterId: voterObjectId,
      voteForId: voteForObjectId,
      categoryId: categoryObjectId,
      votedAt: new Date(),
    });

    return res.status(200).json({ message: "Vote recorded successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  } finally {
    await client.close();
  }
}
