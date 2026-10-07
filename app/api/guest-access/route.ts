import {
  claimGuestRegistration,
  GuestAccessError,
} from "@/lib/auth/guest-registration";
import { getEventById } from "@/lib/events";
import { errorResponse, logServerError, readJsonObject } from "@/lib/http";
import { validGuestEventId } from "@/util/guest-access";

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request);
    if (!body || !validGuestEventId(body.eventId))
      return errorResponse("Evento inválido", 400);
    if (!(await getEventById(body.eventId)))
      return errorResponse("Evento não encontrado", 404);
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
