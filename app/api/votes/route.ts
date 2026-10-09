import { MongoServerError, ObjectId } from "mongodb";
import { GuestAccessError } from "@/lib/auth/guest-registration";
import { getVotingGuest } from "@/lib/auth/voting-guest";
import { getDb } from "@/lib/db";
import { getContestantEntryForVote } from "@/lib/contestant-entries";
import {
  errorResponse,
  logServerError,
  parseObjectId,
  readJsonObject,
} from "@/lib/http";
import { getCategoryById } from "@/util/get-categories";

export async function GET(request?: Request) {
  try {
    const requestedEventId = request
      ? (new URL(request.url).searchParams.get("eventId") ?? undefined)
      : undefined;
    const session = await getVotingGuest(requestedEventId);

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
    if (error instanceof GuestAccessError)
      return errorResponse(error.message, error.status);
    logServerError("Vote lookup failed", error);
    return errorResponse("Não foi possível carregar os votos", 500);
  }
}

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request);
    if (!body) return errorResponse("Corpo da requisição inválido", 400);
    const session = await getVotingGuest(body.eventId);
    const categoryId = parseObjectId(body.categoryId);
    const voteForId = parseObjectId(body.voteForId);
    if (!categoryId || !voteForId) return errorResponse("Voto inválido", 400);
    const category = await getCategoryById(categoryId.toString());
    if (!category || category.eventId !== session.eventId) {
      return errorResponse("Categoria não encontrada", 404);
    }
    const candidate = await getContestantEntryForVote(
      session.eventId,
      voteForId.toString(),
      category,
      session.userId,
    );
    if (!candidate) {
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
    if (error instanceof GuestAccessError)
      return errorResponse(error.message, error.status);
    if (error instanceof MongoServerError && error.code === 11000) {
      return errorResponse("Você já votou nesta categoria", 409);
    }
    logServerError("Vote creation failed", error);
    return errorResponse("Não foi possível registrar o voto", 500);
  }
}
