import { MongoServerError, ObjectId } from "mongodb";
import {
  getGuestRegistration,
  GuestAccessError,
} from "@/lib/auth/guest-registration";
import { ContestEntryClosedError } from "@/lib/contest-entry-writes";
import {
  ContestantEntryWriteError,
  createIndividualContestantEntryWithPhoto,
} from "@/lib/contestant-entry-mutations";
import { normalizeCostumeTitle } from "@/lib/contestant-entries";
import {
  ContestPhotoInputError,
  contestPhotoPreviewUrl,
  MAX_CONTEST_PHOTO_BYTES,
  uploadContestPhoto,
  validateContestPhoto,
} from "@/lib/contestant-photos";
import {
  enqueueContestPhotoCleanup,
  retryContestPhotoCleanup,
} from "@/lib/contestant-photo-cleanup";
import { getDb, getMongoClient } from "@/lib/db";
import { getEventById } from "@/lib/events";
import { errorResponse, logServerError } from "@/lib/http";
import { getContestEntryState } from "@/util/contest-entry-state";
import { validGuestEventId } from "@/util/guest-access";

export const runtime = "nodejs";

function failure(error: unknown) {
  if (error instanceof GuestAccessError) {
    return Response.json(
      { error: error.message, code: error.code },
      { status: error.status, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (error instanceof ContestEntryClosedError) {
    return errorResponse("As inscrições estão encerradas.", 409);
  }
  if (error instanceof ContestPhotoInputError) {
    return errorResponse(error.message, error.status);
  }
  if (error instanceof ContestantEntryWriteError) {
    const messages: Record<string, string> = {
      category_not_available:
        "Não há uma categoria individual disponível nesta edição.",
    };
    return errorResponse(
      messages[error.code] ?? "Não foi possível criar a participação.",
      error.status,
    );
  }
  if (error instanceof MongoServerError && error.code === 11000) {
    return errorResponse(
      "Você já tem uma participação individual nesta edição.",
      409,
    );
  }
  if (error instanceof Error && error.message === "CLOUDINARY_NOT_CONFIGURED") {
    return errorResponse("O envio de fotos não está configurado.", 503);
  }
  logServerError("Individual contest photo creation failed", error);
  return errorResponse("Não foi possível salvar a foto. Tente novamente.", 500);
}

export async function POST(request: Request) {
  let uploaded: Awaited<ReturnType<typeof uploadContestPhoto>> | undefined;
  let db: Awaited<ReturnType<typeof getDb>> | undefined;
  let eventObjectId: ObjectId | undefined;
  const now = new Date();

  try {
    const eventId = new URL(request.url).searchParams.get("eventId");
    if (!validGuestEventId(eventId)) {
      return errorResponse("Evento inválido.", 400);
    }
    const [event, guest] = await Promise.all([
      getEventById(eventId),
      getGuestRegistration(eventId),
    ]);
    if (!event) return errorResponse("Evento não encontrado.", 404);
    if (getContestEntryState(event, now) !== "open") {
      return errorResponse("As inscrições estão encerradas.", 409);
    }

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
      return errorResponse("Selecione uma foto para participar.", 400);
    }
    if (form.get("photoConsent") !== "true") {
      return errorResponse("Confirme a autorização para usar esta foto.", 400);
    }
    let costumeTitle: string | undefined;
    try {
      costumeTitle = normalizeCostumeTitle(form.get("costumeTitle"));
    } catch {
      return errorResponse("O título deve ter até 100 caracteres.", 400);
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const format = validateContestPhoto(file, bytes);
    db = await getDb();
    eventObjectId = new ObjectId(eventId);
    uploaded = await uploadContestPhoto(eventId, bytes, format, now);
    const photo = {
      ...uploaded,
      consentAt: now,
      consentByRsvpId: guest.userId,
    };
    const entry = await createIndividualContestantEntryWithPhoto(
      await getMongoClient(),
      db,
      {
        eventId: eventObjectId,
        rsvpId: new ObjectId(guest.userId),
        displayName: guest.fullName,
        ...(costumeTitle ? { costumeTitle } : {}),
        photo,
        now,
      },
    );
    await retryContestPhotoCleanup(db, eventObjectId, now);

    return Response.json(
      {
        _id: entry._id.toString(),
        categoryId: entry.categoryId.toString(),
        entryType: entry.entryType,
        displayName: entry.displayName,
        ...(entry.costumeTitle ? { costumeTitle: entry.costumeTitle } : {}),
        status: entry.status,
        photoUrl: contestPhotoPreviewUrl(photo.publicId, photo.format),
      },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const cleanupAsset =
      uploaded ??
      (error instanceof ContestPhotoInputError
        ? error.cleanupAsset
        : undefined);
    if (cleanupAsset && db && eventObjectId) {
      try {
        await enqueueContestPhotoCleanup(db, {
          eventId: eventObjectId,
          assetId: cleanupAsset.assetId,
          publicId: cleanupAsset.publicId,
          now,
        });
        await retryContestPhotoCleanup(db, eventObjectId, now);
      } catch {
        // Authenticated assets remain private if cleanup cannot be queued.
      }
    }
    return failure(error);
  }
}
