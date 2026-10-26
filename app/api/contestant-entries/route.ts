import { MongoServerError, ObjectId } from "mongodb";
import {
  getGuestRegistration,
  GuestAccessError,
} from "@/lib/auth/guest-registration";
import { ContestEntryClosedError } from "@/lib/contest-entry-writes";
import {
  ContestantEntryWriteError,
  createGroupContestantEntry,
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

function serializeOwnedEntry(
  entry: Awaited<ReturnType<typeof createGroupContestantEntry>>,
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

function failure(error: unknown, entryType: "individual" | "group") {
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
        "Não há uma categoria compatível com este tipo de inscrição nesta edição.",
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
      entryType === "individual"
        ? "Você já tem uma inscrição individual nesta edição."
        : entryType === "group"
          ? "Você já tem uma inscrição de grupo nesta edição."
          : "Não foi possível concluir esta inscrição.",
      409,
    );
  }
  logServerError("Contestant entry creation failed", error);
  return errorResponse(
    "Não foi possível criar a inscrição. Tente novamente.",
    500,
  );
}

export async function POST(request: Request) {
  const entryType = "group" as const;
  try {
    const body = await readJsonObject(request);
    if (!body || !validGuestEventId(body.eventId)) {
      return errorResponse("Evento inválido.", 400);
    }
    const requestedType = body.entryType;
    if (requestedType !== "group") {
      return errorResponse(
        "A participação individual é criada ao salvar uma foto.",
        400,
      );
    }
    const categoryId =
      body.categoryId === undefined
        ? undefined
        : parseObjectId(body.categoryId);
    if (body.categoryId !== undefined && !categoryId) {
      return errorResponse("Categoria inválida.", 400);
    }

    const entryName = normalizeName(body.groupName);
    if (!entryName) {
      return errorResponse(
        "Informe o nome do grupo (de 2 a 120 caracteres).",
        400,
      );
    }

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

    const [client, db] = await Promise.all([getMongoClient(), getDb()]);
    const entry = await createGroupContestantEntry(client, db, {
      eventId: new ObjectId(event._id),
      ...(categoryId ? { categoryId } : {}),
      ownerRsvpId: new ObjectId(guest.userId),
      groupName: entryName,
      ...(costumeTitle ? { costumeTitle } : {}),
      now,
    });

    return Response.json(serializeOwnedEntry(entry), {
      status: 201,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return failure(error, entryType);
  }
}
