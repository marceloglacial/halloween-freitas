import { ObjectId } from "mongodb";
import {
  getGuestRegistration,
  GuestAccessError,
} from "@/lib/auth/guest-registration";
import { ContestEntryClosedError } from "@/lib/contest-entry-writes";
import {
  ContestantEntryWriteError,
  updateOwnedContestantEntryTitle,
} from "@/lib/contestant-entry-mutations";
import { normalizeCostumeTitle } from "@/lib/contestant-entries";
import { getDb, getMongoClient } from "@/lib/db";
import { getEventById } from "@/lib/events";
import {
  errorResponse,
  logServerError,
  normalizeName,
  parseObjectId,
  readJsonObject,
} from "@/lib/http";
import { getContestEntryState } from "@/util/contest-entry-state";
import { validGuestEventId } from "@/util/guest-access";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const body = await readJsonObject(request);
    if (!body || !validGuestEventId(body.eventId)) {
      return errorResponse("Evento inválido.", 400);
    }
    const hasCostumeTitle = Object.hasOwn(body, "costumeTitle");
    const hasDisplayName = Object.hasOwn(body, "displayName");
    if (!hasCostumeTitle && !hasDisplayName) {
      return errorResponse("Informe os dados que deseja alterar.", 400);
    }
    const { id } = await params;
    const entryId = parseObjectId(id);
    if (!entryId) return errorResponse("Inscrição inválida.", 400);

    let costumeTitle: string | undefined;
    if (hasCostumeTitle) {
      try {
        costumeTitle = normalizeCostumeTitle(body.costumeTitle);
      } catch {
        return errorResponse("O título deve ter até 100 caracteres.", 400);
      }
    }
    const displayName = hasDisplayName ? normalizeName(body.displayName) : null;
    if (hasDisplayName && !displayName) {
      return errorResponse(
        "O nome do grupo deve ter de 2 a 120 caracteres.",
        400,
      );
    }

    const [event, guest] = await Promise.all([
      getEventById(body.eventId),
      getGuestRegistration(body.eventId),
    ]);
    if (!event) return errorResponse("Evento não encontrado.", 404);
    const now = new Date();
    if (getContestEntryState(event, now) !== "open") {
      return errorResponse("As inscrições do concurso estão encerradas.", 409);
    }

    const result = await updateOwnedContestantEntryTitle(
      await getMongoClient(),
      await getDb(),
      {
        eventId: new ObjectId(event._id),
        entryId,
        rsvpId: new ObjectId(guest.userId),
        ...(hasCostumeTitle ? { costumeTitle } : {}),
        ...(hasDisplayName ? { displayName: displayName! } : {}),
        ...(hasDisplayName ? { entryType: "group" as const } : {}),
        now,
      },
    );
    return Response.json(
      {
        entryId: id,
        ...(hasCostumeTitle
          ? { costumeTitle: result.costumeTitle ?? null }
          : {}),
        ...(hasDisplayName ? { displayName: result.displayName } : {}),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof GuestAccessError) {
      return Response.json(
        { error: error.message, code: error.code },
        { status: error.status, headers: { "Cache-Control": "no-store" } },
      );
    }
    if (error instanceof ContestEntryClosedError) {
      return errorResponse("As inscrições do concurso estão encerradas.", 409);
    }
    if (error instanceof ContestantEntryWriteError) {
      const messages: Record<string, string> = {
        entry_not_found: "Inscrição não encontrada.",
        entry_not_editable: "Esta inscrição não pode mais ser alterada.",
        invalid_costume_title: "O título deve ter até 100 caracteres.",
        invalid_group_name: "O nome do grupo deve ter de 2 a 120 caracteres.",
      };
      return Response.json(
        { error: messages[error.code] ?? "Dados da inscrição inválidos." },
        { status: error.status, headers: { "Cache-Control": "no-store" } },
      );
    }
    logServerError("Contestant entry update failed", error);
    return errorResponse(
      "Não foi possível salvar o título. Tente novamente.",
      500,
    );
  }
}
