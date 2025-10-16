import { MongoClient } from "mongodb";

const DATABASE_URL = process.env.DATABASE_URL || "mongodb://localhost:27017";
const DB_NAME = process.env.DATABASE_NAME;
const COLLECTION = "users";

export async function getUsers() {
  const client = new MongoClient(DATABASE_URL);
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const users = await db
      .collection(COLLECTION)
      .find({}, { projection: { fullName: 1, email: 1, imageUrl: 1 } })
      .toArray();
    return users.map((u) => ({ ...u, _id: u._id.toString() }));
  } finally {
    await client.close();
  }
}
