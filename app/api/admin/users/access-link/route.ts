import { ObjectId } from "mongodb";
import { isAdmin } from "@/lib/auth/admin";
import { getDb } from "@/lib/db";
import { getEventById } from "@/lib/events";
import {
  errorResponse,
  logServerError,
  parseObjectId,
  readJsonObject,
} from "@/lib/http";

export async function POST(request: Request) {
  try {
    if (!(await isAdmin())) return errorResponse("Não autorizado", 401);
    const body = await readJsonObject(request);
    if (!body) return errorResponse("Corpo da requisição inválido", 400);
    const eventId = parseObjectId(body.eventId);
    const userId = parseObjectId(body.userId);
    if (
      !eventId ||
      !userId ||
      typeof body.expectedClerkUserId !== "string" ||
      !body.expectedClerkUserId.trim()
    )
      return errorResponse("Dados inválidos", 400);
    if (!(await getEventById(eventId.toString())))
      return errorResponse("Evento não encontrado", 404);
    const result = await (await getDb()).collection("users").updateOne(
      {
        _id: userId,
        eventId: new ObjectId(eventId),
        clerkUserId: body.expectedClerkUserId,
      },
      { $unset: { clerkUserId: "" } },
    );
    if (!result.matchedCount)
      return errorResponse(
        "O vínculo mudou ou o convidado não pertence a este evento. Atualize a lista antes de tentar novamente.",
        409,
      );
    return new Response(null, { status: 204 });
  } catch (error) {
    logServerError("Admin access link reset failed", error);
    return errorResponse("Não foi possível redefinir o vínculo", 500);
  }
}
