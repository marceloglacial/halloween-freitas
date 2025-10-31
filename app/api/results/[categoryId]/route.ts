import { MongoClient, ObjectId } from "mongodb";

const client = new MongoClient(process.env.DATABASE_URL!);

export async function GET(
  request: Request,
  context: { params: Promise<{ categoryId: string }> },
) {
  try {
    const { categoryId } = await context.params;
    if (!categoryId || typeof categoryId !== "string") {
      return new Response(JSON.stringify({ error: "Categoria inválida" }), {
        status: 400,
      });
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
      return new Response(
        JSON.stringify({ message: "Ainda não há votos nesta categoria" }),
        { status: 200 },
      );
    }

    // 3. Fetch all details for users with max votes
    const userIds = voteCounts.map((v) => v._id);
    const topUsers = await db
      .collection("users")
      .find({ _id: { $in: userIds } })
      .toArray();

    // 4. Add votes property to each user
    const topUsersWithVotes = topUsers.map((user) => {
      const voteInfo = voteCounts.find((v) => v._id.equals(user._id));
      return {
        ...(user as unknown as User),
        votes: voteInfo ? voteInfo.voteCount : 0,
        createdAt: user.createdAt ?? null,
      };
    });

    // Calculate total votes in this category
    const totalVotes = voteCounts.reduce(
      (sum, v) => sum + (v.voteCount ?? 0),
      0,
    );

    // 5. Pick the earliest created user (handle tie)
    const finalUsers = topUsersWithVotes.sort((a, b) => {
      // Primary: sort by votes descending
      if ((b.votes ?? 0) !== (a.votes ?? 0))
        return (b.votes ?? 0) - (a.votes ?? 0);
      // Secondary: Alpha
      const aName = (a.fullName ?? "").toString().toLowerCase();
      const bName = (b.fullName ?? "").toString().toLowerCase();
      if (aName < bName) return -1;
      if (aName > bName) return 1;
      return 0;
    });

    return new Response(JSON.stringify({ users: finalUsers, totalVotes }), {
      status: 200,
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: "Erro interno do servidor" }), {
      status: 500,
    });
  } finally {
    await client.close();
  }
}
