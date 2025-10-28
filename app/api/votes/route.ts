import { NextResponse } from "next/server";
import { MongoClient, ObjectId } from "mongodb";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const voterId = searchParams.get("voterId");
  if (!voterId) {
    return NextResponse.json({ error: "voterId is required" }, { status: 400 });
  }
  const client = new MongoClient(process.env.DATABASE_URL!);
  try {
    await client.connect();
    const db = client.db(process.env.DATABASE_NAME);
    const votes = await db
      .collection("votes")
      .find({ voterId: new ObjectId(voterId) })
      .toArray();
    return NextResponse.json(votes, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  } finally {
    await client.close();
  }
}

export async function POST(request: Request) {
  const client = new MongoClient(process.env.DATABASE_URL!);
  try {
    const body = await request.json();
    const { voterId, voteForId, categoryId } = body;

    if (!voterId || !voteForId || !categoryId) {
      return NextResponse.json(
        { error: "Campos obrigatórios faltando" },
        { status: 400 },
      );
    }

    if (voterId === voteForId) {
      return NextResponse.json(
        { error: "Você não pode votar em si mesmo" },
        { status: 400 },
      );
    }

    await client.connect();
    const db = client.db(process.env.DATABASE_NAME);

    const voterObjectId = new ObjectId(voterId);
    const voteForObjectId = new ObjectId(voteForId);
    const categoryObjectId = new ObjectId(categoryId);

    // Check if voter exists
    const voter = await db.collection("users").findOne({ _id: voterObjectId });
    if (!voter)
      return NextResponse.json(
        { error: "Votante não encontrado" },
        { status: 404 },
      );

    // Check if vote target exists
    const voteForUser = await db
      .collection("users")
      .findOne({ _id: voteForObjectId });
    if (!voteForUser)
      return NextResponse.json(
        { error: "Usuário para votar não encontrado" },
        { status: 404 },
      );

    // Check if voter already voted in this category
    const existingVote = await db.collection("votes").findOne({
      voterId: voterObjectId,
      categoryId: categoryObjectId,
    });

    if (existingVote) {
      return NextResponse.json(
        { error: "Você já votou nesta categoria" },
        { status: 400 },
      );
    }

    // Insert the vote
    await db.collection("votes").insertOne({
      voterId: voterObjectId,
      voteForId: voteForObjectId,
      categoryId: categoryObjectId,
      votedAt: new Date(),
    });

    return NextResponse.json(
      { message: "Voto registrado com sucesso" },
      { status: 200 },
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  } finally {
    await client.close();
  }
}
