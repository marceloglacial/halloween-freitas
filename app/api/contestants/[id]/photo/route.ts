import { ObjectId } from "mongodb";
import {
  getGuestRegistration,
  GuestAccessError,
} from "@/lib/auth/guest-registration";
import { getMongoClient, getDb } from "@/lib/db";
import { getEventById } from "@/lib/events";
import { errorResponse, logServerError } from "@/lib/http";
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
import {
  ContestPhotoWriteError,
  getContestantEntryForPhoto,
  saveContestPhotoForGuest,
} from "@/lib/contestant-photo-writes";
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
  if (
    error instanceof ContestPhotoInputError ||
    error instanceof ContestPhotoWriteError
  ) {
    const messages: Record<string, string> = {
      entry_not_found: "Inscrição não encontrada.",
      entry_not_editable: "Esta inscrição não pode mais ser alterada.",
      photo_changed_retry: "A foto mudou. Atualize a página e tente novamente.",
    };
    return Response.json(
      {
        error: messages[error.message] ?? error.message,
        code: error.message,
      },
      { status: error.status, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (error instanceof Error && error.message === "CLOUDINARY_NOT_CONFIGURED") {
    return errorResponse("O envio de fotos não está configurado.", 503);
  }
  logServerError("Contest photo upload failed", error);
  return errorResponse("Não foi possível salvar a foto. Tente novamente.", 500);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const eventId = new URL(request.url).searchParams.get("eventId");
    if (!validGuestEventId(eventId))
      return errorResponse("Evento inválido", 400);
    const { id } = await params;
    if (!ObjectId.isValid(id)) return errorResponse("Inscrição inválida", 400);

    const [event, guest] = await Promise.all([
      getEventById(eventId),
      getGuestRegistration(eventId),
    ]);
    if (!event) return errorResponse("Evento não encontrado", 404);
    const now = new Date();
    if (getContestEntryState(event, now) !== "open") {
      return errorResponse("As inscrições do concurso estão fechadas.", 409);
    }

    const db = await getDb();
    const eventObjectId = new ObjectId(eventId);
    const rsvpObjectId = new ObjectId(guest.userId);
    const entryObjectId = new ObjectId(id);
    const entry = await getContestantEntryForPhoto(
      db,
      eventObjectId,
      entryObjectId,
      rsvpObjectId,
    );
    if (!entry) return errorResponse("Inscrição não encontrada.", 404);
    if (entry.status === "locked" || entry.status === "withdrawn") {
      return errorResponse("Esta inscrição não pode mais ser alterada.", 409);
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
      return errorResponse("Selecione uma foto para enviar.", 400);
    }
    if (form.get("photoConsent") !== "true") {
      return errorResponse("Confirme a autorização para usar esta foto.", 400);
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    const format = validateContestPhoto(file, bytes);
    let uploaded;
    try {
      uploaded = await uploadContestPhoto(eventId, bytes, format, now);
    } catch (error) {
      if (error instanceof ContestPhotoInputError && error.cleanupAsset) {
        try {
          await enqueueContestPhotoCleanup(db, {
            eventId: eventObjectId,
            ...error.cleanupAsset,
            now,
          });
          await retryContestPhotoCleanup(db, eventObjectId, now);
        } catch {
          // Invalid assets remain authenticated if the cleanup job cannot be saved.
        }
      }
      throw error;
    }
    const photo = {
      ...uploaded,
      consentAt: now,
      consentByRsvpId: guest.userId,
    };

    try {
      await saveContestPhotoForGuest(await getMongoClient(), db, {
        eventId: eventObjectId,
        entryId: entryObjectId,
        rsvpId: rsvpObjectId,
        photo,
        now,
      });
    } catch (error) {
      try {
        await enqueueContestPhotoCleanup(db, {
          eventId: eventObjectId,
          assetId: photo.assetId,
          publicId: photo.publicId,
          now,
        });
        await retryContestPhotoCleanup(db, eventObjectId, now);
      } catch {
        // The authenticated asset stays private if safe cleanup cannot be queued.
      }
      throw error;
    }

    await retryContestPhotoCleanup(db, eventObjectId, now);
    return Response.json(
      {
        photoUrl: contestPhotoPreviewUrl(photo.publicId, photo.format),
        uploadedAt: photo.uploadedAt.toISOString(),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return failure(error);
  }
}
