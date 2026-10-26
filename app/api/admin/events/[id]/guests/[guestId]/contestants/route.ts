import { MongoServerError, ObjectId } from "mongodb";
import { auth } from "@clerk/nextjs/server";
import { isAdmin } from "@/lib/auth/admin";
import { ContestEntryClosedError } from "@/lib/contest-entry-writes";
import {
  ContestantEntryWriteError,
  createGroupContestantEntry,
} from "@/lib/contestant-entry-mutations";
import { normalizeCostumeTitle } from "@/lib/contestant-entries";
import type { UserDocument } from "@/lib/users";
import { getDb, getMongoClient } from "@/lib/db";
import { getEventById } from "@/lib/events";
import {
  errorResponse,
  logServerError,
  normalizeName,
  readJsonObject,
} from "@/lib/http";
import { getContestEntryState } from "@/util/contest-entry-state";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; guestId: string }> },
) {
  const { userId: actorId } = await auth();
  if (!actorId || !(await isAdmin(actorId))) {
    return errorResponse("Não autorizado", 401);
  }

  const { id, guestId } = await params;
  if (!ObjectId.isValid(id)) return errorResponse("Evento inválido", 400);
  if (!ObjectId.isValid(guestId)) {
    return errorResponse("Convidado inválido", 400);
  }
  const body = await readJsonObject(request);
  if (!body) return errorResponse("Corpo da requisição inválido", 400);
  const groupName = normalizeName(body.groupName);
  if (!groupName || groupName.length > 120) {
    return errorResponse(
      "Informe um nome de fantasia entre 2 e 120 caracteres.",
      400,
    );
  }
  let costumeTitle: string | undefined;
  try {
    costumeTitle = normalizeCostumeTitle(body.costumeTitle);
  } catch {
    return errorResponse("O título deve ter até 100 caracteres.", 400);
  }

  try {
    const event = await getEventById(id);
    if (!event) return errorResponse("Evento não encontrado", 404);
    const now = new Date();
    if (getContestEntryState(event, now) !== "open") {
      return errorResponse("As inscrições do concurso estão encerradas.", 409);
    }
    const eventId = new ObjectId(event._id);
    const ownerRsvpId = new ObjectId(guestId);
    const db = await getDb();
    const guest = await db
      .collection<UserDocument>("users")
      .findOne(
        { _id: ownerRsvpId, eventId, status: { $ne: "cancelled" } },
        { projection: { _id: 1 } },
      );
    if (!guest)
      return errorResponse("Convidado não encontrado nesta edição.", 404);

    const entry = await createGroupContestantEntry(await getMongoClient(), db, {
      eventId,
      ownerRsvpId,
      groupName,
      ...(costumeTitle ? { costumeTitle } : {}),
      adminActorId: actorId,
      now,
    });
    return Response.json(
      {
        _id: entry._id.toString(),
        entryType: entry.entryType,
        displayName: entry.displayName,
        ...(entry.costumeTitle ? { costumeTitle: entry.costumeTitle } : {}),
        status: entry.status,
      },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof ContestEntryClosedError) {
      return errorResponse("As inscrições do concurso estão encerradas.", 409);
    }
    if (error instanceof ContestantEntryWriteError) {
      const messages: Record<string, string> = {
        category_not_available:
          "Não há uma categoria de grupo disponível nesta edição.",
        category_not_found: "Categoria não encontrada nesta edição.",
      };
      return errorResponse(
        messages[error.code] ??
          "Não foi possível cadastrar a fantasia de grupo.",
        error.status,
      );
    }
    if (error instanceof MongoServerError && error.code === 11000) {
      return errorResponse(
        "Este convidado já tem uma fantasia de grupo nesta edição.",
        409,
      );
    }
    logServerError("Admin group contestant creation failed", error);
    return errorResponse(
      "Não foi possível cadastrar a fantasia de grupo.",
      500,
    );
  }
}
