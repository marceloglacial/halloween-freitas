import { ObjectId } from "mongodb";
import { isAdmin } from "@/lib/auth/admin";
import { getDb, getMongoClient } from "@/lib/db";
import { getEventById } from "@/lib/events";
import {
  freezeContestantEntries,
  reopenContestantEntries,
} from "@/lib/contestant-entry-freeze";
import { errorResponse, readJsonObject, logServerError } from "@/lib/http";
import { findFirstPlaceTies } from "@/lib/runoff";
import type { BallotDocument, VotingRoundDocument } from "@/lib/voting-rounds";

const lifecycleActions = [
  "close-contest-entry",
  "reopen-contest-entry",
  "start-voting",
  "end-voting",
  "publish-results",
  "unpublish-results",
] as const;

type LifecycleAction = (typeof lifecycleActions)[number];

function isLifecycleAction(value: unknown): value is LifecycleAction {
  return lifecycleActions.some((action) => action === value);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdmin())) return errorResponse("Não autorizado", 401);

  const { id } = await params;
  if (!ObjectId.isValid(id)) return errorResponse("Evento inválido", 400);

  const body = await readJsonObject(request);
  if (!body || !isLifecycleAction(body.action)) {
    return errorResponse("Ação inválida", 400);
  }
  const action = body.action;

  try {
    const db = await getDb();
    const eventId = new ObjectId(id);
    const now = new Date();
    const filters: Record<LifecycleAction, Record<string, unknown>> = {
      "close-contest-entry": {
        _id: eventId,
        status: "active",
        votingStatus: "not_started",
        $or: [
          { contestEntryStatus: "open" },
          { contestEntryStatus: { $exists: false } },
        ],
      },
      "reopen-contest-entry": {
        _id: eventId,
        status: "active",
        votingStatus: "not_started",
        contestEntryStatus: "closed",
      },
      "start-voting": {
        _id: eventId,
        status: "active",
        votingStatus: { $in: ["not_started", "ended"] },
        contestEntryStatus: "closed",
        eventStartsAt: { $lte: now },
      },
      "end-voting": {
        _id: eventId,
        status: "active",
        votingStatus: "open",
      },
      "publish-results": { _id: eventId, votingStatus: "ended" },
      "unpublish-results": { _id: eventId, resultsPublished: true },
    };
    const updates: Record<LifecycleAction, Record<string, unknown>> = {
      "start-voting": {
        contestEntryStatus: "closed",
        votingStatus: "open",
        resultsPublished: false,
        updatedAt: now,
      },
      "close-contest-entry": {
        contestEntryStatus: "closed",
        updatedAt: now,
      },
      "reopen-contest-entry": {
        contestEntryStatus: "open",
        updatedAt: now,
      },
      "end-voting": { votingStatus: "ended", updatedAt: now },
      "publish-results": { resultsPublished: true, updatedAt: now },
      "unpublish-results": { resultsPublished: false, updatedAt: now },
    };

    let result: { matchedCount: number } = { matchedCount: 0 };
    let runoffOpened = false;
    if (
      action === "close-contest-entry" ||
      action === "reopen-contest-entry" ||
      action === "start-voting"
    ) {
      const session = (await getMongoClient()).startSession();
      try {
        await session.withTransaction(async () => {
          const previousEvent =
            action === "start-voting"
              ? await db
                  .collection("events")
                  .findOne(
                    { _id: eventId },
                    { projection: { votingStatus: 1 }, session },
                  )
              : null;
          result = await db.collection("events").updateOne(
            filters[action],
            {
              $set: updates[action],
              $inc: { contestEntryMutationVersion: 1 },
            },
            { session },
          );
          if (!result.matchedCount) return;
          if (action === "reopen-contest-entry") {
            await reopenContestantEntries(db, eventId, session, now);
          } else {
            await freezeContestantEntries(db, eventId, session, now);
            if (action === "start-voting") {
              const rounds = db.collection<VotingRoundDocument>("votingRounds");
              const currentRounds = await rounds
                .find({ eventId }, { session })
                .sort({ openedAt: -1, _id: -1 })
                .limit(1)
                .toArray();
              const currentRound = currentRounds[0];

              if (previousEvent?.votingStatus === "not_started") {
                if (currentRound) {
                  throw new Error("PRIMARY_ROUND_STATE_INVALID");
                }
              } else if (
                previousEvent?.votingStatus === "ended" &&
                (!currentRound || currentRound.status !== "ended")
              ) {
                throw new Error("CURRENT_ROUND_STATE_INVALID");
              }

              if (previousEvent?.votingStatus === "ended" && currentRound) {
                const reopened = await rounds.updateOne(
                  {
                    _id: currentRound._id,
                    eventId,
                    status: "ended",
                  },
                  { $set: { status: "open", reopenedAt: now } },
                  { session },
                );
                if (!reopened.matchedCount) {
                  throw new Error("PRIMARY_ROUND_REOPEN_FAILED");
                }
              } else if (previousEvent?.votingStatus === "not_started") {
                const categories = await db
                  .collection("categories")
                  .find({ eventId }, { projection: { _id: 1 }, session })
                  .toArray();
                await rounds.insertOne(
                  {
                    _id: new ObjectId(),
                    eventId,
                    type: "primary",
                    status: "open",
                    categoryIds: categories.map(({ _id }) => _id as ObjectId),
                    openedAt: now,
                  },
                  { session },
                );
              }
            }
          }
        });
      } finally {
        await session.endSession();
      }
    } else if (action === "end-voting") {
      const session = (await getMongoClient()).startSession();
      try {
        await session.withTransaction(async () => {
          runoffOpened = false;
          const rounds = db.collection<VotingRoundDocument>("votingRounds");
          const currentRound = await rounds.findOne(
            { eventId, status: "open" },
            { session },
          );
          result = await db
            .collection("events")
            .updateOne(
              filters[action],
              { $set: { updatedAt: now } },
              { session },
            );
          if (!result.matchedCount) return;
          if (!currentRound) throw new Error("OPEN_VOTING_ROUND_NOT_FOUND");
          const endedRound = await rounds.updateOne(
            { _id: currentRound._id, eventId, status: "open" },
            { $set: { status: "ended", endedAt: now } },
            { session },
          );
          if (!endedRound.matchedCount) {
            throw new Error("OPEN_VOTING_ROUND_CLOSE_FAILED");
          }

          if (currentRound.type === "primary") {
            const existingRunoff = await rounds.findOne(
              { eventId, type: "runoff" },
              { session },
            );
            if (existingRunoff) {
              throw new Error("RUNOFF_ALREADY_EXISTS_WHILE_PRIMARY_OPEN");
            }
            const ballots = await db
              .collection<BallotDocument>("votes")
              .find(
                { eventId, roundId: currentRound._id },
                {
                  projection: { categoryId: 1, candidateId: 1 },
                  session,
                },
              )
              .toArray();
            const candidateScopes = findFirstPlaceTies(
              currentRound.categoryIds,
              ballots,
            );
            if (candidateScopes.length > 0) {
              const runoff: VotingRoundDocument = {
                _id: new ObjectId(),
                eventId,
                type: "runoff",
                status: "open",
                categoryIds: candidateScopes.map(
                  ({ categoryId }) => categoryId,
                ),
                candidateIdsByCategory: candidateScopes,
                openedAt: now,
              };
              await rounds.insertOne(runoff, { session });
              result = await db
                .collection("events")
                .updateOne(
                  filters[action],
                  { $set: { resultsPublished: false, updatedAt: now } },
                  { session },
                );
              if (!result.matchedCount) {
                throw new Error("RUNOFF_EVENT_UPDATE_FAILED");
              }
              runoffOpened = true;
            } else {
              result = await db
                .collection("events")
                .updateOne(
                  filters[action],
                  { $set: updates[action] },
                  { session },
                );
              if (!result.matchedCount) {
                throw new Error("VOTING_EVENT_END_FAILED");
              }
            }
          } else {
            result = await db
              .collection("events")
              .updateOne(
                filters[action],
                { $set: updates[action] },
                { session },
              );
            if (!result.matchedCount) {
              throw new Error("VOTING_EVENT_END_FAILED");
            }
          }
        });
      } finally {
        await session.endSession();
      }
    } else {
      result = await db
        .collection("events")
        .updateOne(filters[action], { $set: updates[action] });
    }

    if (!result.matchedCount) {
      const event = await getEventById(id);
      if (!event) return errorResponse("Evento não encontrado", 404);
      if (
        action === "close-contest-entry" ||
        action === "reopen-contest-entry"
      ) {
        if (event.status !== "active") {
          return errorResponse(
            "Ative o evento antes de alterar as inscrições do concurso",
            409,
          );
        }
        if (event.votingStatus !== "not_started") {
          return errorResponse(
            "As inscrições do concurso foram encerradas com o início da votação",
            409,
          );
        }
        if (
          action === "close-contest-entry" &&
          event.contestEntryStatus === "closed"
        ) {
          return errorResponse(
            "As inscrições do concurso já estão fechadas",
            409,
          );
        }
        if (
          action === "reopen-contest-entry" &&
          event.contestEntryStatus !== "closed"
        ) {
          return errorResponse(
            "As inscrições do concurso já estão abertas",
            409,
          );
        }
      }
      if (action === "start-voting") {
        if (event.status !== "active") {
          return errorResponse(
            "Ative o evento antes de iniciar a votação",
            409,
          );
        }
        if (new Date(event.eventStartsAt) > now) {
          return errorResponse(
            "A votação só pode começar após o início do evento",
            409,
          );
        }
        if (event.contestEntryStatus !== "closed") {
          return errorResponse(
            "Feche as inscrições do concurso antes de iniciar a votação",
            409,
          );
        }
        return errorResponse("A votação já está aberta", 409);
      }
      if (action === "end-voting") {
        return errorResponse("A votação não está aberta", 409);
      }
      if (action === "publish-results") {
        return errorResponse(
          "Encerre a votação antes de publicar os resultados",
          409,
        );
      }
    }

    const response = Response.json(await getEventById(id));
    if (action === "end-voting" && runoffOpened) {
      response.headers.set("X-Runoff-Opened", "true");
    }
    return response;
  } catch (error) {
    logServerError("Admin event lifecycle update failed", error);
    return errorResponse("Não foi possível atualizar o evento", 500);
  }
}
