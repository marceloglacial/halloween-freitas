import type { NextApiRequest, NextApiResponse } from "next";
import { MongoClient } from "mongodb";

const client = new MongoClient(process.env.DATABASE_URL!);

export default async function handler(
  _req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    await client.connect();
    const db = client.db(process.env.DATABASE_NAME);

    // Get all categories
    const categories = await db
      .collection("categories")
      .find({})
      .sort({ title: 1 })
      .toArray();

    // Get all users
    const users = await db
      .collection("users")
      .find({})
      .sort({ fullName: 1 })
      .toArray();

    return res.status(200).json({ categories, users });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  } finally {
    await client.close();
  }
}
