import { ObjectId } from "mongodb";
import { isAdmin } from "@/lib/auth/admin";
import { getDb } from "@/lib/db";
import { getEventById } from "@/lib/events";
import { errorResponse, readJsonObject } from "@/lib/http";

const lifecycleActions = [
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

  try {
    const db = await getDb();
    const eventId = new ObjectId(id);
    const now = new Date();
    const filters: Record<LifecycleAction, Record<string, unknown>> = {
      "start-voting": {
        _id: eventId,
        status: "active",
        startsAt: { $lte: now },
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
        votingStatus: "open",
        resultsPublished: false,
        updatedAt: now,
      },
      "end-voting": { votingStatus: "ended", updatedAt: now },
      "publish-results": { resultsPublished: true, updatedAt: now },
      "unpublish-results": { resultsPublished: false, updatedAt: now },
    };

    const result = await db
      .collection("events")
      .updateOne(filters[body.action], { $set: updates[body.action] });

    if (!result.matchedCount) {
      const event = await getEventById(id);
      if (!event) return errorResponse("Evento não encontrado", 404);
      if (body.action === "start-voting") {
        if (event.status === "active" && new Date(event.startsAt) > now) {
          return errorResponse(
            "A votação só pode começar após o início do evento",
            409,
          );
        }
        return errorResponse("Ative o evento antes de iniciar a votação", 409);
      }
      if (body.action === "end-voting") {
        return errorResponse("A votação não está aberta", 409);
      }
      if (body.action === "publish-results") {
        return errorResponse(
          "Encerre a votação antes de publicar os resultados",
          409,
        );
      }
    }

    return Response.json(await getEventById(id));
  } catch (error) {
    console.error("Admin event lifecycle update failed", error);
    return errorResponse("Não foi possível atualizar o evento", 500);
  }
}
