import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";

const uri = process.env.DATABASE_URL;
const dbName = process.env.DATABASE_NAME;

if (!uri) {
  throw new Error("DATABASE_URL environment variable not set");
}
if (!dbName) {
  throw new Error("DATABASE_NAME environment variable not set");
}

let cachedClient: MongoClient | null = null;

async function connectToDatabase() {
  if (cachedClient) return cachedClient;
  const client = new MongoClient(uri as string);
  await client.connect();
  cachedClient = client;
  return client;
}

export async function POST(request: Request) {
  try {
    const { fullName, email } = await request.json();
    if (!fullName || !email) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    const client = await connectToDatabase();
    const db = client.db(dbName);
    const users = db.collection("users");
    const existing = await users.findOne({ email });
    if (existing) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 409 },
      );
    }
    await users.insertOne({ fullName, email, createdAt: new Date() });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}
