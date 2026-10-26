import { auth } from "@clerk/nextjs/server";
import { ObjectId } from "mongodb";
import { isAdmin } from "@/lib/auth/admin";
import { ContestEntryClosedError } from "@/lib/contest-entry-writes";
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
  removeContestPhotoForAdmin,
  saveContestPhotoForAdmin,
} from "@/lib/contestant-photo-writes";
import { getContestEntryState } from "@/util/contest-entry-state";

export const runtime = "nodejs";

const privateImageHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  "CDN-Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "Content-Security-Policy": "default-src 'none'; sandbox",
};

type AdminContext =
  | { response: Response }
  | {
      response?: never;
      actorId: string;
      event: HalloweenEvent;
      eventId: ObjectId;
      entryId: ObjectId;
    };

async function adminContext(
  params: Promise<{ id: string; entryId: string }>,
): Promise<AdminContext> {
  const { userId } = await auth();
  if (!userId || !(await isAdmin(userId))) {
    return { response: errorResponse("Não autorizado", 401) } as const;
  }
  const { id, entryId } = await params;
  if (!ObjectId.isValid(id)) {
    return { response: errorResponse("Evento inválido", 400) } as const;
  }
  if (!ObjectId.isValid(entryId)) {
    return { response: errorResponse("Fantasia inválida", 400) } as const;
  }
  const event = await getEventById(id);
  if (!event) {
    return { response: errorResponse("Evento não encontrado", 404) } as const;
  }
  return {
    actorId: userId,
    event,
    eventId: new ObjectId(event._id),
    entryId: new ObjectId(entryId),
  } as const;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; entryId: string }> },
) {
  try {
    const context = await adminContext(params);
    if (context.response) return context.response;
    const entry = await (await getDb()).collection("contestants").findOne(
      {
        _id: context.entryId,
        eventId: context.eventId,
        status: { $ne: "withdrawn" },
      },
      { projection: { contestPhoto: 1 } },
    );
    const photo = entry?.contestPhoto as
      { publicId?: string; format?: "jpg" | "png" | "webp" } | undefined;
    if (!photo?.publicId || !photo.format) {
      return new Response("Foto não encontrada", {
        status: 404,
        headers: privateImageHeaders,
      });
    }
    const image = await fetch(
      contestPhotoPreviewUrl(photo.publicId, photo.format),
      { cache: "no-store" },
    );
    if (!image.ok || !image.body) {
      return new Response("Não foi possível carregar a foto", {
        status: 502,
        headers: privateImageHeaders,
      });
    }
    return new Response(image.body, {
      headers: {
        ...privateImageHeaders,
        "Content-Type":
          photo.format === "jpg" ? "image/jpeg" : `image/${photo.format}`,
      },
    });
  } catch (error) {
    logServerError("Admin contestant photo delivery failed", error);
    return new Response("Não foi possível carregar a foto", {
      status: 500,
      headers: privateImageHeaders,
    });
  }
}

export async function PUT(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ id: string; entryId: string }>;
  },
): Promise<Response> {
  try {
    const context = await adminContext(params);
    if (context.response) return context.response;
    const { id } = await params;
    const { actorId: userId, event, eventId, entryId: entryObjectId } = context;

    const db = await getDb();
    const existing = await db
      .collection("contestants")
      .findOne(
        { _id: entryObjectId, eventId, status: { $ne: "withdrawn" } },
        { projection: { _id: 1, ownerRsvpId: 1, contestPhoto: 1 } },
      );
    if (!existing) return errorResponse("Fantasia não encontrada.", 404);
    const currentPhoto = existing.contestPhoto as
      | {
          assetId?: string;
          consentAt?: Date;
          consentByRsvpId?: string;
        }
      | undefined;
    if (!currentPhoto?.assetId && getContestEntryState(event) !== "open") {
      return errorResponse(
        "Não é possível adicionar uma foto após o encerramento das inscrições.",
        409,
      );
    }
    if (!existing.ownerRsvpId) {
      return errorResponse("A fantasia não tem um convidado responsável.", 409);
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
    if (!currentPhoto?.assetId && form.get("photoConsent") !== "true") {
      return errorResponse(
        "Confirme que o convidado autorizou o uso desta foto.",
        400,
      );
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
            eventId,
            ...error.cleanupAsset,
            now,
          });
          await retryContestPhotoCleanup(db, eventId, now);
        } catch {
          // Invalid assets remain authenticated if safe cleanup cannot be saved.
        }
      }
      throw error;
    }

    const photo = {
      ...uploaded,
      consentAt: currentPhoto?.consentAt ?? now,
      consentByRsvpId:
        currentPhoto?.consentByRsvpId ?? existing.ownerRsvpId.toString(),
    };
    try {
      await saveContestPhotoForAdmin(await getMongoClient(), db, {
        eventId,
        entryId: entryObjectId,
        actorId: userId,
        photo,
        now,
      });
    } catch (error) {
      try {
        await enqueueContestPhotoCleanup(db, {
          eventId,
          assetId: photo.assetId,
          publicId: photo.publicId,
          now,
        });
        await retryContestPhotoCleanup(db, eventId, now);
      } catch {
        // Keep the orphan authenticated if its safe cleanup cannot be persisted.
      }
      throw error;
    }

    await retryContestPhotoCleanup(db, eventId, now);
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
        entry_not_found: "Fantasia não encontrada.",
        entry_not_editable: "Esta fantasia não pode mais ser alterada.",
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
    logServerError("Admin contestant photo update failed", error);
    return errorResponse(
      "Não foi possível salvar a foto. Tente novamente.",
      500,
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; entryId: string }> },
) {
  try {
    const context = await adminContext(params);
    if (context.response) return context.response;
    if (getContestEntryState(context.event) !== "open") {
      return errorResponse(
        "A foto não pode ser removida após o encerramento das inscrições.",
        409,
      );
    }
    const db = await getDb();
    const now = new Date();
    const removed = await removeContestPhotoForAdmin(
      await getMongoClient(),
      db,
      {
        eventId: context.eventId,
        entryId: context.entryId,
        actorId: context.actorId,
        now,
      },
    );
    if (!removed) return errorResponse("Foto não encontrada", 404);
    await retryContestPhotoCleanup(db, context.eventId, now);
    return Response.json(
      { removed: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof ContestPhotoWriteError) {
      return Response.json(
        { error: error.message },
        { status: error.status, headers: { "Cache-Control": "no-store" } },
      );
    }
    if (error instanceof ContestEntryClosedError) {
      return errorResponse("As inscrições estão encerradas.", 409);
    }
    logServerError("Admin contestant photo removal failed", error);
    return errorResponse("Não foi possível remover a foto", 500);
  }
}
