import { MongoServerError, ObjectId } from "mongodb";
import {
  getGuestRegistration,
  GuestAccessError,
} from "@/lib/auth/guest-registration";
import { ContestEntryClosedError } from "@/lib/contest-entry-writes";
import {
  ContestantEntryWriteError,
  createIndividualContestantEntry,
} from "@/lib/contestant-entry-mutations";
import { normalizeCostumeTitle } from "@/lib/contestant-entries";
import { getDb, getMongoClient } from "@/lib/db";
import { getEventById } from "@/lib/events";
import {
  errorResponse,
  logServerError,
  parseObjectId,
  readJsonObject,
} from "@/lib/http";
import { getContestEntryState } from "@/util/contest-entry-state";
import { validGuestEventId } from "@/util/guest-access";

export const runtime = "nodejs";

function serializeOwnedEntry(
  entry: Awaited<ReturnType<typeof createIndividualContestantEntry>>,
) {
  return {
    _id: entry._id.toString(),
    categoryId: entry.categoryId.toString(),
    entryType: entry.entryType,
    displayName: entry.displayName,
    ...(entry.costumeTitle ? { costumeTitle: entry.costumeTitle } : {}),
    status: entry.status,
  };
}

function failure(error: unknown) {
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
      category_not_found: "Categoria não encontrada nesta edição.",
      category_not_available:
        "Escolha uma categoria disponível para fantasia individual.",
      entry_not_found: "Inscrição não encontrada.",
      entry_not_editable: "Esta inscrição não pode mais ser alterada.",
      invalid_costume_title: "O título deve ter até 100 caracteres.",
    };
    return Response.json(
      { error: messages[error.code] ?? "Dados da inscrição inválidos." },
      { status: error.status, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (error instanceof MongoServerError && error.code === 11000) {
    return errorResponse(
      "Você já tem uma inscrição individual nesta edição.",
      409,
    );
  }
  logServerError("Individual contestant entry creation failed", error);
  return errorResponse(
    "Não foi possível criar a inscrição. Tente novamente.",
    500,
  );
}

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request);
    if (!body || !validGuestEventId(body.eventId)) {
      return errorResponse("Evento inválido.", 400);
    }
    const categoryId = parseObjectId(body.categoryId);
    if (!categoryId) return errorResponse("Categoria inválida.", 400);

    let costumeTitle: string | undefined;
    try {
      costumeTitle = normalizeCostumeTitle(body.costumeTitle);
    } catch {
      return errorResponse("O título deve ter até 100 caracteres.", 400);
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

    const entry = await createIndividualContestantEntry(
      await getMongoClient(),
      await getDb(),
      {
        eventId: new ObjectId(event._id),
        categoryId,
        rsvpId: new ObjectId(guest.userId),
        displayName: guest.fullName,
        ...(costumeTitle ? { costumeTitle } : {}),
        now,
      },
    );

    return Response.json(serializeOwnedEntry(entry), {
      status: 201,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return failure(error);
  }
}
