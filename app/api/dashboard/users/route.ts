import { NextResponse } from "next/server";
import { getUsers } from "@/util/get-users";
import { MongoClient, ObjectId } from "mongodb";

const DATABASE_URL = process.env.DATABASE_URL || "mongodb://localhost:27017";
const DB_NAME = process.env.DATABASE_NAME;
const COLLECTION = "users";

export async function GET() {
  try {
    const users = await getUsers();
    return NextResponse.json(users);
  } catch (err) {
    console.error(err);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(req: Request) {
  const client = new MongoClient(DATABASE_URL);
  try {
    const body = await req.json();
    if (!body.fullName || !body.email) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }
    await client.connect();
    const db = client.db(DB_NAME);
    const result = await db.collection(COLLECTION).insertOne({
      fullName: body.fullName,
      email: body.email,
      imageUrl: body.imageUrl || null,
    });
    return NextResponse.json({ _id: result.insertedId.toString(), ...body });
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 },
    );
  } finally {
    await client.close();
  }
}

export async function PUT(req: Request) {
  const client = new MongoClient(DATABASE_URL);
  try {
    const body = await req.json();
    if (!body._id || (!body.fullName && !body.email && !body.imageUrl)) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }
    await client.connect();
    const db = client.db(DB_NAME);
    const update = {} as User;
    if (body.fullName) update.fullName = body.fullName;
    if (body.email) update.email = body.email;
    if (body.imageUrl !== undefined) update.imageUrl = body.imageUrl;
    const result = await db
      .collection(COLLECTION)
      .updateOne({ _id: new ObjectId(body._id) }, { $set: update });
    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json({ ...update, _id: body._id });
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 },
    );
  } finally {
    await client.close();
  }
}

export async function DELETE(req: Request) {
  const client = new MongoClient(DATABASE_URL);
  try {
    const body = await req.json();
    if (!body._id) {
      return NextResponse.json({ error: "Missing user id" }, { status: 400 });
    }
    await client.connect();
    const db = client.db(DB_NAME);
    const result = await db
      .collection(COLLECTION)
      .deleteOne({ _id: new ObjectId(body._id) });
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 },
    );
  } finally {
    await client.close();
  }
}
