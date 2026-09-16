import { MongoServerError, ObjectId } from "mongodb";
import { getGuestSession } from "@/lib/auth/guest-session";
import { getDb } from "@/lib/db";
import { getCurrentEvent, getEventPhase } from "@/lib/events";
import { errorResponse, parseObjectId, readJsonObject } from "@/lib/http";
import { getCategoryById } from "@/util/get-categories";
import { getUserById } from "@/lib/users";
import { isEligibleCandidate } from "@/lib/voting";

export async function GET() {
  try {
    const session = await getGuestSession();
    if (!session) return errorResponse("Sessão inválida", 401);

    const votes = await (
      await getDb()
    )
      .collection("votes")
      .find(
        {
          eventId: new ObjectId(session.eventId),
          voterId: new ObjectId(session.userId),
        },
        { projection: { categoryId: 1 } },
      )
      .toArray();
    return Response.json(
      votes.map((vote) => ({ categoryId: vote.categoryId.toString() })),
    );
  } catch (error) {
    console.error("Vote lookup failed", error);
    return errorResponse("Não foi possível carregar os votos", 500);
  }
}

export async function POST(request: Request) {
  try {
    const session = await getGuestSession();
    if (!session) return errorResponse("Sessão inválida", 401);

    const event = await getCurrentEvent();
    if (
      !event ||
      event._id !== session.eventId ||
      getEventPhase(event) !== "voting"
    ) {
      return errorResponse("A votação não está aberta", 403);
    }

    const body = await readJsonObject(request);
    if (!body) return errorResponse("Corpo da requisição inválido", 400);
    const categoryId = parseObjectId(body.categoryId);
    const voteForId = parseObjectId(body.voteForId);
    if (!categoryId || !voteForId) return errorResponse("Voto inválido", 400);
    if (session.userId === voteForId.toString()) {
      return errorResponse("Você não pode votar em si mesmo", 400);
    }

    const [category, candidate] = await Promise.all([
      getCategoryById(categoryId.toString()),
      getUserById(voteForId.toString()),
    ]);
    if (!category || category.eventId !== session.eventId) {
      return errorResponse("Categoria não encontrada", 404);
    }
    if (!candidate || candidate.eventId !== session.eventId) {
      return errorResponse("Candidato não encontrado", 404);
    }
    if (!isEligibleCandidate(category, candidate, session.userId)) {
      return errorResponse("Candidato inelegível para esta categoria", 400);
    }

    await (await getDb()).collection("votes").insertOne({
      eventId: new ObjectId(session.eventId),
      voterId: new ObjectId(session.userId),
      voteForId,
      categoryId,
      votedAt: new Date(),
    });
    return Response.json({ message: "Voto registrado com sucesso" });
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) {
      return errorResponse("Você já votou nesta categoria", 409);
    }
    console.error("Vote creation failed", error);
    return errorResponse("Não foi possível registrar o voto", 500);
  }
}
