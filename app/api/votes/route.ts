import { MongoServerError, ObjectId } from "mongodb";
import { GuestAccessError } from "@/lib/auth/guest-registration";
import { getVotingGuest } from "@/lib/auth/voting-guest";
import { getDb, getMongoClient } from "@/lib/db";
import { getContestantEntryForVote } from "@/lib/contestant-entries";
import {
  getOpenVotingRound,
  roundAllowsCandidate,
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

type DuplicateBallotScope = {
  eventId: ObjectId;
  roundId: ObjectId;
  categoryId: ObjectId;
  voterRsvpId: ObjectId;
};

function voteConflictResponse(
  code: "round_changed" | "already_voted",
  message: string,
) {
  return Response.json({ error: message, code }, { status: 409 });
}

export async function GET(request?: Request) {
  try {
    const requestedEventId = request
      ? (new URL(request.url).searchParams.get("eventId") ?? undefined)
      : undefined;
    const session = await getVotingGuest(requestedEventId);
    const round = await getOpenVotingRound(session.eventId);
    if (!round)
      return errorResponse("A rodada de votação não está aberta", 409);

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
  let duplicateBallotScope: DuplicateBallotScope | null = null;

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
      return voteConflictResponse(
        "round_changed",
        "A rodada de votação mudou. Confira as categorias disponíveis.",
      );
    }
    if (!roundIncludesCategory(round, session.eventId, categoryId.toString())) {
      return errorResponse("Categoria indisponível nesta rodada", 400);
    }
    if (
      !roundAllowsCandidate(
        round,
        session.eventId,
        categoryId.toString(),
        candidateId.toString(),
      )
    ) {
      return errorResponse("Candidato indisponível nesta rodada", 400);
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
    duplicateBallotScope = {
      eventId: new ObjectId(session.eventId),
      roundId: round._id,
      categoryId,
      voterRsvpId: new ObjectId(session.userId),
    };
    try {
      await mongoSession.withTransaction(async () => {
        const currentRound = await db.collection("votingRounds").updateOne(
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
            ...duplicateBallotScope,
            candidateId,
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
      if (duplicateBallotScope) {
        try {
          const existingBallot = await (
            await getDb()
          )
            .collection("votes")
            .findOne(duplicateBallotScope, { projection: { _id: 1 } });
          if (existingBallot) {
            return voteConflictResponse(
              "already_voted",
              "Você já votou nesta categoria",
            );
          }
        } catch (lookupError) {
          logServerError("Existing ballot lookup failed", lookupError);
        }
      }
      console.error("Vote insert violated an unexpected unique index", {
        keyPattern: error.keyPattern,
      });
      return errorResponse("Não foi possível registrar seu voto", 500);
    }
    if (error instanceof VotingRoundClosedError) {
      return voteConflictResponse(
        "round_changed",
        "A rodada de votação mudou. Confira as categorias disponíveis.",
      );
    }
    logServerError("Vote creation failed", error);
    return errorResponse("Não foi possível registrar o voto", 500);
  }
}
