import { MongoClient, ObjectId } from "mongodb";

const DATABASE_URL = process.env.DATABASE_URL || "mongodb://localhost:27017";
const DB_NAME = process.env.DATABASE_NAME;
const COLLECTION = "categories";

export async function getCategories() {
  const client = new MongoClient(DATABASE_URL);
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const categories = await db.collection(COLLECTION).find({}).toArray();
    return categories.map((u) => ({ ...u, _id: u._id.toString() }));
  } finally {
    await client.close();
  }
}

export async function getCategoryById(id: string) {
  const client = new MongoClient(DATABASE_URL);
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const category = await db
      .collection(COLLECTION)
      .findOne({ _id: new ObjectId(id) });
    if (!category) return null;
    return { ...category, _id: category._id.toString() };
  } finally {
    await client.close();
  }
}
