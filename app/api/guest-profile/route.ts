import {
  getGuestRegistration,
  GuestAccessError,
  updateGuestRegistrationName,
} from "@/lib/auth/guest-registration";
import { getEventById } from "@/lib/events";
import {
  errorResponse,
  logServerError,
  normalizeName,
  readJsonObject,
} from "@/lib/http";
import { validGuestEventId } from "@/util/guest-access";

function eventSummary(
  event: NonNullable<Awaited<ReturnType<typeof getEventById>>>,
) {
  return {
    title: event.title,
    year: event.year,
    status: event.status,
    contestEntryStatus: event.contestEntryStatus,
    votingStatus: event.votingStatus,
  };
}

function guestError(error: unknown) {
  if (error instanceof GuestAccessError)
    return Response.json(
      { error: error.message, code: error.code },
      { status: error.status, headers: { "Cache-Control": "no-store" } },
    );
  logServerError("Guest profile request failed", error);
  return errorResponse(
    "Não foi possível carregar seu perfil. Tente novamente.",
    500,
  );
}

export async function GET(request: Request) {
  try {
    const eventId = new URL(request.url).searchParams.get("eventId");
    if (!validGuestEventId(eventId))
      return errorResponse("Evento inválido", 400);
    const event = await getEventById(eventId);
    if (!event) return errorResponse("Evento não encontrado", 404);
    const guest = await getGuestRegistration(eventId);
    return Response.json(
      { fullName: guest.fullName, event: eventSummary(event) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return guestError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const body = await readJsonObject(request);
    if (!body || !validGuestEventId(body.eventId))
      return errorResponse("Evento inválido", 400);
    const fullName = normalizeName(body.fullName);
    if (!fullName) return errorResponse("Nome inválido", 400);

    const event = await getEventById(body.eventId);
    if (!event) return errorResponse("Evento não encontrado", 404);
    const guest = await updateGuestRegistrationName(body.eventId, fullName);
    return Response.json(
      { fullName: guest.fullName, event: eventSummary(event) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return guestError(error);
  }
}
