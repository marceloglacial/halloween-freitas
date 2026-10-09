import { auth } from "@clerk/nextjs/server";
import { ObjectId } from "mongodb";
import { isAdmin } from "@/lib/auth/admin";
import { getDb, getMongoClient } from "@/lib/db";
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
  saveContestPhotoForAdmin,
} from "@/lib/contestant-photo-writes";

export const runtime = "nodejs";

export async function PUT(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ id: string; entryId: string }>;
  },
) {
  const { userId } = await auth();
  if (!userId || !(await isAdmin(userId))) {
    return errorResponse("Não autorizado", 401);
  }

  try {
    const { id, entryId } = await params;
    if (!ObjectId.isValid(id)) return errorResponse("Evento inválido", 400);
    if (!ObjectId.isValid(entryId)) {
      return errorResponse("Inscrição inválida", 400);
    }
    const event = await getEventById(id);
    if (!event) return errorResponse("Evento não encontrado", 404);

    const db = await getDb();
    const eventObjectId = new ObjectId(id);
    const entryObjectId = new ObjectId(entryId);
    const existing = await db.collection("contestants").findOne(
      {
        _id: entryObjectId,
        eventId: eventObjectId,
        status: { $ne: "withdrawn" },
      },
      { projection: { _id: 1, contestPhoto: 1 } },
    );
    if (!existing) return errorResponse("Inscrição não encontrada.", 404);
    const currentPhoto = existing.contestPhoto as
      | {
          assetId?: string;
          consentAt?: Date;
          consentByRsvpId?: string;
        }
      | undefined;
    if (
      !currentPhoto?.assetId ||
      !currentPhoto.consentAt ||
      !currentPhoto.consentByRsvpId
    ) {
      return errorResponse(
        "A foto ainda não tem autorização registrada para substituição.",
        409,
      );
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
    const bytes = Buffer.from(await file.arrayBuffer());
    const format = validateContestPhoto(file, bytes);
    const now = new Date();
    let uploaded;
    try {
      uploaded = await uploadContestPhoto(id, bytes, format, now);
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
          // Invalid assets remain authenticated if safe cleanup cannot be saved.
        }
      }
      throw error;
    }

    const photo = {
      ...uploaded,
      consentAt: currentPhoto.consentAt,
      consentByRsvpId: currentPhoto.consentByRsvpId,
    };
    try {
      await saveContestPhotoForAdmin(await getMongoClient(), db, {
        eventId: eventObjectId,
        entryId: entryObjectId,
        actorId: userId,
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
        // Keep the orphan authenticated if its safe cleanup cannot be persisted.
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
    if (
      error instanceof ContestPhotoInputError ||
      error instanceof ContestPhotoWriteError
    ) {
      const messages: Record<string, string> = {
        entry_not_found: "Inscrição não encontrada.",
        entry_not_editable: "Esta inscrição não pode mais ser alterada.",
        photo_changed_retry: "A foto mudou. Atualize e tente novamente.",
        photo_consent_required:
          "A foto ainda não tem autorização registrada para substituição.",
      };
      return Response.json(
        { error: messages[error.message] ?? error.message },
        { status: error.status, headers: { "Cache-Control": "no-store" } },
      );
    }
    if (
      error instanceof Error &&
      error.message === "CLOUDINARY_NOT_CONFIGURED"
    ) {
      return errorResponse("O envio de fotos não está configurado.", 503);
    }
    logServerError("Admin contestant photo replacement failed", error);
    return errorResponse(
      "Não foi possível salvar a foto. Tente novamente.",
      500,
    );
  }
}
