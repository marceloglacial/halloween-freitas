import { auth } from "@clerk/nextjs/server";
import { ObjectId } from "mongodb";
import { isAdmin } from "@/lib/auth/admin";
import { getDb, getMongoClient } from "@/lib/db";
import { getEventById } from "@/lib/events";
import { logServerError } from "@/lib/http";
import { deletePartyPhotoAsset } from "@/lib/party-photos";
import {
  PartyAlbumWriteError,
  removePartyPhoto,
  retryPartyPhotoCleanup,
} from "@/lib/party-photo-writes";

export const runtime = "nodejs";
const noStore = { "Cache-Control": "private, no-store" };

function adminError(message: string, status: number) {
  return Response.json({ error: message }, { status, headers: noStore });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; photoId: string }> },
) {
  const { userId } = await auth();
  if (!userId || !(await isAdmin(userId))) {
    return adminError("Não autorizado", 401);
  }

  const { id, photoId } = await params;
  if (!ObjectId.isValid(id)) return adminError("Evento inválido", 400);
  if (!ObjectId.isValid(photoId)) {
    return adminError("Foto inválida", 400);
  }

  try {
    if (!(await getEventById(id))) {
      return adminError("Evento não encontrado", 404);
    }
    const db = await getDb();
    const eventId = new ObjectId(id);
    await removePartyPhoto(await getMongoClient(), db, {
      eventId,
      photoId: new ObjectId(photoId),
      actorId: userId,
      now: new Date(),
    });

    try {
      await retryPartyPhotoCleanup(db, eventId, deletePartyPhotoAsset);
    } catch (error) {
      logServerError("Admin party photo cleanup retry failed", error);
    }

    return Response.json({ removed: true }, { headers: noStore });
  } catch (error) {
    if (error instanceof PartyAlbumWriteError) {
      return Response.json(
        { error: error.message },
        { status: error.status, headers: noStore },
      );
    }
    if (
      error instanceof Error &&
      error.message === "CLOUDINARY_NOT_CONFIGURED"
    ) {
      return adminError("A remoção de fotos não está configurada.", 503);
    }
    logServerError("Admin party photo removal failed", error);
    return adminError("Não foi possível remover a foto.", 500);
  }
}
