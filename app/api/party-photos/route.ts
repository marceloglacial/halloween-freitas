import { ObjectId } from "mongodb";
import {
  getGuestRegistration,
  GuestAccessError,
} from "@/lib/auth/guest-registration";
import { getDb, getMongoClient } from "@/lib/db";
import { getEventById } from "@/lib/events";
import { logServerError } from "@/lib/http";
import {
  deletePartyPhotoAsset,
  MAX_PARTY_PHOTO_BYTES,
  PartyPhotoInputError,
  partyPhotoPreviewUrl,
  uploadPartyPhoto,
  validatePartyPhoto,
} from "@/lib/party-photos";
import {
  enqueuePartyPhotoCleanup,
  getPartyPhotosForGuest,
  retryPartyPhotoCleanup,
  savePartyPhoto,
  serializePartyPhotoForGuest,
} from "@/lib/party-photo-writes";
import {
  consumeRateLimit,
  rateLimitResponse,
  requestRateLimitPolicies,
  trustedClientAddress,
} from "@/lib/request-rate-limits";
import { validGuestEventId } from "@/util/guest-access";

export const runtime = "nodejs";

const noStore = { "Cache-Control": "private, no-store" };

function apiError(message: string, status: number) {
  return Response.json({ error: message }, { status, headers: noStore });
}

function failure(error: unknown) {
  if (error instanceof GuestAccessError) {
    return Response.json(
      { error: error.message, code: error.code },
      { status: error.status, headers: noStore },
    );
  }
  if (error instanceof PartyPhotoInputError) {
    return Response.json(
      { error: error.message },
      { status: error.status, headers: noStore },
    );
  }
  if (
    error instanceof Error &&
    ["CLOUDINARY_NOT_CONFIGURED", "RATE_LIMIT_SECRET_NOT_CONFIGURED"].includes(
      error.message,
    )
  ) {
    return apiError("O envio de fotos não está configurado.", 503);
  }
  logServerError("Party photo request failed", error);
  return apiError("Não foi possível salvar a foto. Tente novamente.", 500);
}

function eventIdFromRequest(request: Request) {
  const eventId = new URL(request.url).searchParams.get("eventId");
  return validGuestEventId(eventId) ? eventId : null;
}

export async function GET(request: Request) {
  try {
    const eventId = eventIdFromRequest(request);
    if (!eventId) return apiError("Evento inválido", 400);
    const event = await getEventById(eventId);
    if (!event) return apiError("Evento não encontrado", 404);
    const guest = await getGuestRegistration(eventId);
    const db = await getDb();
    const photos = await getPartyPhotosForGuest(
      db,
      new ObjectId(eventId),
      new ObjectId(guest.userId),
    );
    return Response.json(
      {
        photos: photos.map((photo) =>
          serializePartyPhotoForGuest(
            photo,
            partyPhotoPreviewUrl(photo.publicId, photo.format),
          ),
        ),
      },
      { headers: noStore },
    );
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request) {
  let db: Awaited<ReturnType<typeof getDb>> | undefined;
  let eventId: string | undefined;
  try {
    const parsedEventId = eventIdFromRequest(request);
    if (!parsedEventId) return apiError("Evento inválido", 400);
    eventId = parsedEventId;
    const event = await getEventById(eventId);
    if (!event) return apiError("Evento não encontrado", 404);
    const guest = await getGuestRegistration(eventId);
    const now = new Date();
    if (now.getTime() < new Date(event.eventStartsAt).getTime()) {
      return apiError("O envio de fotos abre quando a festa começar.", 409);
    }

    const address = trustedClientAddress(request);
    if (!address) {
      return apiError(
        "O envio de fotos está temporariamente indisponível.",
        503,
      );
    }
    db = await getDb();
    const eventObjectId = new ObjectId(eventId);
    const [addressLimit, guestLimit] = await Promise.all([
      consumeRateLimit(db, {
        eventId: eventObjectId,
        policy: requestRateLimitPolicies.partyPhotoAddress,
        identity: address,
        now,
      }),
      consumeRateLimit(db, {
        eventId: eventObjectId,
        policy: requestRateLimitPolicies.partyPhotoGuest,
        identity: guest.userId,
        now,
      }),
    ]);
    if (!addressLimit.allowed || !guestLimit.allowed) {
      return rateLimitResponse(
        Math.max(
          addressLimit.allowed ? 0 : addressLimit.retryAfterSeconds,
          guestLimit.allowed ? 0 : guestLimit.retryAfterSeconds,
        ),
      );
    }

    const contentLength = Number(request.headers.get("content-length"));
    if (
      Number.isFinite(contentLength) &&
      contentLength > MAX_PARTY_PHOTO_BYTES + 256 * 1024
    ) {
      return apiError("A foto deve ter até 8 MB.", 413);
    }
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return apiError("Selecione uma foto para enviar.", 400);
    }
    const files = form.getAll("image");
    if (files.length !== 1 || !(files[0] instanceof File)) {
      return apiError("Selecione uma foto para enviar.", 400);
    }
    const file = files[0];
    const bytes = Buffer.from(await file.arrayBuffer());
    validatePartyPhoto(file, bytes);

    const asset = await uploadPartyPhoto(eventId, bytes, now);
    let photo;
    try {
      photo = await savePartyPhoto(await getMongoClient(), db, {
        eventId: eventObjectId,
        uploaderRsvpId: new ObjectId(guest.userId),
        asset,
      });
    } catch (error) {
      try {
        await enqueuePartyPhotoCleanup(db, {
          eventId: eventObjectId,
          assetId: asset.assetId,
          publicId: asset.publicId,
          now,
        });
        await retryPartyPhotoCleanup(
          db,
          eventObjectId,
          deletePartyPhotoAsset,
          now,
        );
      } catch (cleanupError) {
        logServerError(
          "Party photo orphan cleanup could not be queued",
          cleanupError,
        );
      }
      throw error;
    }
    try {
      await retryPartyPhotoCleanup(
        db,
        eventObjectId,
        deletePartyPhotoAsset,
        now,
      );
    } catch (cleanupError) {
      logServerError("Party photo cleanup retry failed", cleanupError);
    }
    return Response.json(
      {
        photo: serializePartyPhotoForGuest(
          photo,
          partyPhotoPreviewUrl(photo.publicId, photo.format),
        ),
      },
      { headers: noStore },
    );
  } catch (error) {
    if (
      error instanceof PartyPhotoInputError &&
      error.cleanupAsset &&
      db &&
      eventId
    ) {
      try {
        await enqueuePartyPhotoCleanup(db, {
          eventId: new ObjectId(eventId),
          ...error.cleanupAsset,
          now: new Date(),
        });
        await retryPartyPhotoCleanup(
          db,
          new ObjectId(eventId),
          deletePartyPhotoAsset,
        );
      } catch {
        // The invalid asset remains authenticated if cleanup cannot be queued.
      }
    }
    return failure(error);
  }
}
