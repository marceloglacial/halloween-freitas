import { group } from "console";
import { MongoClient } from "mongodb";

const DATABASE_URL = process.env.DATABASE_URL || "mongodb://localhost:27017";
const DB_NAME = process.env.DATABASE_NAME;
const COLLECTION = "users";

export async function getUsers(): Promise<User[]> {
  const client = new MongoClient(DATABASE_URL);
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const users = await db
      .collection(COLLECTION)
      .find(
        {},
        { projection: { fullName: 1, email: 1, imageUrl: 1, group: 1 } },
      )
      .toArray();
    return users.map((u) => ({
      _id: u._id.toString(),
      fullName: u.fullName,
      email: u.email,
      imageUrl: u.imageUrl,
      group: u.group,
    }));
  } finally {
    await client.close();
  }
}

export async function getUserById(userId: string) {
  const client = new MongoClient(DATABASE_URL);
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const user = await db
      .collection(COLLECTION)
      .findOne(
        { _id: new (await import("mongodb")).ObjectId(userId) },
        { projection: { fullName: 1, email: 1, imageUrl: 1 } },
      );
    if (!user) return null;
    return { ...user, _id: user._id.toString() };
  } finally {
    await client.close();
  }
}
