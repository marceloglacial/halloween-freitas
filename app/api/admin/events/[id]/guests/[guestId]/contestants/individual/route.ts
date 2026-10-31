import { MongoServerError, ObjectId } from "mongodb";
import { auth } from "@clerk/nextjs/server";
import { isAdmin } from "@/lib/auth/admin";
import { ContestEntryClosedError } from "@/lib/contest-entry-writes";
import {
  ContestantEntryWriteError,
  createIndividualContestantEntryWithPhoto,
} from "@/lib/contestant-entry-mutations";
import { normalizeCostumeTitle } from "@/lib/contestant-entries";
import {
  ContestPhotoInputError,
  MAX_CONTEST_PHOTO_BYTES,
  uploadContestPhoto,
  validateContestPhoto,
} from "@/lib/contestant-photos";
import {
  enqueueContestPhotoCleanup,
  retryContestPhotoCleanup,
} from "@/lib/contestant-photo-cleanup";
import type { UserDocument } from "@/lib/users";
import { getDb, getMongoClient } from "@/lib/db";
import { getEventById } from "@/lib/events";
import { errorResponse, logServerError } from "@/lib/http";
import { getContestEntryState } from "@/util/contest-entry-state";

export const runtime = "nodejs";

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

  const now = new Date();
  let uploaded: Awaited<ReturnType<typeof uploadContestPhoto>> | undefined;
  let db: Awaited<ReturnType<typeof getDb>> | undefined;
  const eventId = new ObjectId(id);
  try {
    const event = await getEventById(id);
    if (!event) return errorResponse("Evento não encontrado", 404);
    if (getContestEntryState(event, now) !== "open") {
      return errorResponse("As inscrições do concurso estão encerradas.", 409);
    }

    const guestIdObject = new ObjectId(guestId);
    db = await getDb();
    const guest = await db
      .collection<UserDocument>("users")
      .findOne(
        { _id: guestIdObject, eventId, status: { $ne: "cancelled" } },
        { projection: { _id: 1, fullName: 1 } },
      );
    if (!guest)
      return errorResponse("Convidado não encontrado nesta edição.", 404);

    const length = Number(request.headers.get("content-length"));
    if (
      Number.isFinite(length) &&
      length > MAX_CONTEST_PHOTO_BYTES + 256 * 1024
    ) {
      return errorResponse("A foto deve ter até 8 MB.", 413);
    }
    const form = await request.formData();
    const file = form.get("image");
    if (!(file instanceof File)) {
      return errorResponse(
        "Selecione uma foto para cadastrar a fantasia.",
        400,
      );
    }
    if (form.get("photoConsent") !== "true") {
      return errorResponse(
        "Confirme que o convidado autorizou o uso desta foto.",
        400,
      );
    }
    let costumeTitle: string | undefined;
    try {
      costumeTitle = normalizeCostumeTitle(form.get("costumeTitle"));
    } catch {
      return errorResponse("O título deve ter até 100 caracteres.", 400);
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const format = validateContestPhoto(file, bytes);
    uploaded = await uploadContestPhoto(id, bytes, format, now);
    const photo = {
      ...uploaded,
      consentAt: now,
      consentByRsvpId: guest._id.toString(),
    };
    const entry = await createIndividualContestantEntryWithPhoto(
      await getMongoClient(),
      db,
      {
        eventId,
        rsvpId: guest._id,
        displayName: guest.fullName,
        ...(costumeTitle ? { costumeTitle } : {}),
        photo,
        adminActorId: actorId,
        now,
      },
    );
    await retryContestPhotoCleanup(db, eventId, now);
    return Response.json(
      {
        _id: entry._id.toString(),
        entryType: entry.entryType,
        displayName: entry.displayName,
        ...(entry.costumeTitle ? { costumeTitle: entry.costumeTitle } : {}),
        status: entry.status,
        photoUrl: `/api/admin/events/${id}/contestants/${entry._id.toString()}/photo`,
      },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const cleanupAsset =
      uploaded ??
      (error instanceof ContestPhotoInputError
        ? error.cleanupAsset
        : undefined);
    if (cleanupAsset && db) {
      try {
        await enqueueContestPhotoCleanup(db, {
          eventId,
          assetId: cleanupAsset.assetId,
          publicId: cleanupAsset.publicId,
          now,
        });
        await retryContestPhotoCleanup(db, eventId, now);
      } catch {
        // Keep the private asset queued for safe cleanup when possible.
      }
    }
    if (error instanceof ContestEntryClosedError) {
      return errorResponse("As inscrições do concurso estão encerradas.", 409);
    }
    if (error instanceof ContestPhotoInputError) {
      return errorResponse(error.message, error.status);
    }
    if (error instanceof ContestantEntryWriteError) {
      return errorResponse(
        error.code === "category_not_available"
          ? "Não há uma categoria individual disponível nesta edição."
          : "Não foi possível cadastrar a fantasia individual.",
        error.status,
      );
    }
    if (error instanceof MongoServerError && error.code === 11000) {
      return errorResponse(
        "Este convidado já tem uma fantasia individual nesta edição.",
        409,
      );
    }
    if (
      error instanceof Error &&
      error.message === "CLOUDINARY_NOT_CONFIGURED"
    ) {
      return errorResponse("O envio de fotos não está configurado.", 503);
    }
    logServerError("Admin individual contestant creation failed", error);
    return errorResponse(
      "Não foi possível cadastrar a fantasia individual.",
      500,
    );
  }
}
