import { MongoClient, ObjectId } from "mongodb";

const DATABASE_URL = process.env.DATABASE_URL || "mongodb://localhost:27017";
const DB_NAME = process.env.DATABASE_NAME;
const COLLECTION = "categories";

export async function getCategories(): Promise<Category[]> {
  const client = new MongoClient(DATABASE_URL);
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const categories = await db
      .collection(COLLECTION)
      .find({})
      .sort({ order: -1 })
      .toArray();
    // Ensure all required fields for Category are present
    return categories.map((u) => ({
      _id: u._id.toString(),
      title: u.title ?? "",
      icon: u.icon ?? "",
      order: u.order ?? "",
    }));
  } finally {
    await client.close();
  }
}

export async function getCategoryById(id: string): Promise<Category | null> {
  const client = new MongoClient(DATABASE_URL);
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const category = await db
      .collection(COLLECTION)
      .findOne({ _id: new ObjectId(id) });
    if (!category) return null;
    return {
      _id: category._id.toString(),
      title: category.title,
      icon: category.icon,
      order: category.order,
    };
  } finally {
    await client.close();
  }
}
