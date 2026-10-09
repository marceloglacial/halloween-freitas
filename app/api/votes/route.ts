import { MongoServerError, ObjectId } from "mongodb";
import { GuestAccessError } from "@/lib/auth/guest-registration";
import { getVotingGuest } from "@/lib/auth/voting-guest";
import { getDb, getMongoClient } from "@/lib/db";
import { getContestantEntryForVote } from "@/lib/contestant-entries";
import {
  getOpenVotingRound,
  roundIncludesCategory,
} from "@/lib/voting-rounds";
import {
  errorResponse,
  logServerError,
  parseObjectId,
  readJsonObject,
} from "@/lib/http";
import { getCategoryById } from "@/util/get-categories";

class VotingRoundClosedError extends Error {}

export async function GET(request?: Request) {
  try {
    const requestedEventId = request
      ? (new URL(request.url).searchParams.get("eventId") ?? undefined)
      : undefined;
    const session = await getVotingGuest(requestedEventId);
    const round = await getOpenVotingRound(session.eventId);
    if (!round) return errorResponse("A rodada de votação não está aberta", 409);

    const votes = await (
      await getDb()
    )
      .collection("votes")
      .find(
        {
          eventId: new ObjectId(session.eventId),
          roundId: round._id,
          voterRsvpId: new ObjectId(session.userId),
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
    const roundId = parseObjectId(body.roundId);
    const categoryId = parseObjectId(body.categoryId);
    const candidateId = parseObjectId(body.candidateId);
    if (!roundId || !categoryId || !candidateId) {
      return errorResponse("Voto inválido", 400);
    }
    const round = await getOpenVotingRound(session.eventId);
    if (!round || !round._id.equals(roundId)) {
      return errorResponse("A rodada de votação não está aberta", 409);
    }
    if (!roundIncludesCategory(round, session.eventId, categoryId.toString())) {
      return errorResponse("Categoria indisponível nesta rodada", 400);
    }
    const category = await getCategoryById(categoryId.toString());
    if (!category || category.eventId !== session.eventId) {
      return errorResponse("Categoria não encontrada", 404);
    }
    const candidate = await getContestantEntryForVote(
      session.eventId,
      candidateId.toString(),
      category,
      session.userId,
    );
    if (!candidate) {
      return errorResponse("Candidato inelegível para esta categoria", 400);
    }

    const db = await getDb();
    const mongoSession = (await getMongoClient()).startSession();
    try {
      await mongoSession.withTransaction(async () => {
        const currentRound = await db
          .collection("votingRounds")
          .updateOne(
            {
              _id: round._id,
              eventId: new ObjectId(session.eventId),
              status: "open",
              categoryIds: categoryId,
            },
            { $inc: { ballotMutationVersion: 1 } },
            { session: mongoSession },
          );
        if (!currentRound.matchedCount) throw new VotingRoundClosedError();
        await db.collection("votes").insertOne(
          {
            eventId: new ObjectId(session.eventId),
            roundId: round._id,
            voterRsvpId: new ObjectId(session.userId),
            candidateId,
            categoryId,
            votedAt: new Date(),
          },
          { session: mongoSession },
        );
      });
    } finally {
      await mongoSession.endSession();
    }
    return Response.json({ message: "Voto registrado com sucesso" });
  } catch (error) {
    if (error instanceof GuestAccessError)
      return errorResponse(error.message, error.status);
    if (error instanceof MongoServerError && error.code === 11000) {
      return errorResponse("Você já votou nesta categoria", 409);
    }
    if (error instanceof VotingRoundClosedError) {
      return errorResponse("A rodada de votação não está aberta", 409);
    }
    logServerError("Vote creation failed", error);
    return errorResponse("Não foi possível registrar o voto", 500);
  }
}
