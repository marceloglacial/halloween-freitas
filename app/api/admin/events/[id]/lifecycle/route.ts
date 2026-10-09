import { ObjectId } from "mongodb";
import { isAdmin } from "@/lib/auth/admin";
import { getDb, getMongoClient } from "@/lib/db";
import { getEventById } from "@/lib/events";
import {
  freezeContestantEntries,
  reopenContestantEntries,
} from "@/lib/contestant-entry-freeze";
import { errorResponse, readJsonObject, logServerError } from "@/lib/http";

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
    if (
      action === "close-contest-entry" ||
      action === "reopen-contest-entry" ||
      action === "start-voting"
    ) {
      const session = (await getMongoClient()).startSession();
      try {
        await session.withTransaction(async () => {
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
        if (event.status === "active" && new Date(event.eventStartsAt) > now) {
          return errorResponse(
            "A votação só pode começar após o início do evento",
            409,
          );
        }
        return errorResponse("Ative o evento antes de iniciar a votação", 409);
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

    return Response.json(await getEventById(id));
  } catch (error) {
    logServerError("Admin event lifecycle update failed", error);
    return errorResponse("Não foi possível atualizar o evento", 500);
  }
}
