import {
  claimGuestRegistration,
  GuestAccessError,
} from "@/lib/auth/guest-registration";
import { getDb } from "@/lib/db";
import { getEventById } from "@/lib/events";
import { errorResponse, logServerError, readJsonObject } from "@/lib/http";
import {
  consumeRateLimit,
  rateLimitResponse,
  requestRateLimitPolicies,
  trustedClientAddress,
} from "@/lib/request-rate-limits";
import { validGuestEventId } from "@/util/guest-access";
import { ObjectId } from "mongodb";

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request);
    if (!body || !validGuestEventId(body.eventId))
      return errorResponse("Evento inválido", 400);
    const event = await getEventById(body.eventId);
    if (!event) return errorResponse("Evento não encontrado", 404);
    const clientAddress = trustedClientAddress(request);
    if (!clientAddress) {
      return errorResponse("Serviço temporariamente indisponível", 503);
    }
    const now = new Date();
    const limit = await consumeRateLimit(await getDb(), {
      eventId: new ObjectId(event._id),
      policy: requestRateLimitPolicies.guestLinkAddress,
      identity: clientAddress,
      now,
    });
    if (!limit.allowed) return rateLimitResponse(limit.retryAfterSeconds);

    const guest = await claimGuestRegistration(body.eventId);
    return Response.json(
      { fullName: guest.fullName },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof GuestAccessError)
      return Response.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    logServerError("Guest access failed", error);
    return errorResponse(
      "Não foi possível verificar seu acesso. Tente novamente.",
      500,
    );
  }
}
