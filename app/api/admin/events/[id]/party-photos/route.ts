import { auth } from "@clerk/nextjs/server";
import { ObjectId } from "mongodb";
import { isAdmin } from "@/lib/auth/admin";
import { getDb, getMongoClient } from "@/lib/db";
import { getEventById } from "@/lib/events";
import { logServerError, readJsonObject } from "@/lib/http";
import {
  partyPhotoPreviewUrl,
  type PartyPhotoFormat,
} from "@/lib/party-photos";
import {
  getPartyAlbumForAdmin,
  PartyAlbumWriteError,
  setPartyAlbumPublication,
} from "@/lib/party-photo-writes";

export const runtime = "nodejs";
const noStore = { "Cache-Control": "private, no-store" };

function adminError(message: string, status: number) {
  return Response.json({ error: message }, { status, headers: noStore });
}

function partyPhotoError(error: unknown, context: string) {
  if (error instanceof PartyAlbumWriteError) {
    return Response.json(
      { error: error.message },
      { status: error.status, headers: noStore },
    );
  }
  if (error instanceof Error && error.message === "CLOUDINARY_NOT_CONFIGURED") {
    return adminError("O álbum de fotos não está configurado.", 503);
  }
  logServerError(context, error);
  return adminError("Não foi possível atualizar o álbum de fotos.", 500);
}

async function authorizedAdmin() {
  const { userId } = await auth();
  return userId && (await isAdmin(userId)) ? userId : null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await authorizedAdmin();
  if (!userId) return adminError("Não autorizado", 401);
  const { id } = await params;
  if (!ObjectId.isValid(id)) return adminError("Evento inválido", 400);

  try {
    const event = await getEventById(id);
    if (!event) return adminError("Evento não encontrado", 404);
    const { album, photos } = await getPartyAlbumForAdmin(
      await getDb(),
      new ObjectId(id),
    );
    return Response.json(
      {
        published: album?.published === true,
        publishedAt: album?.publishedAt?.toISOString() ?? null,
        updatedAt: album?.updatedAt?.toISOString() ?? null,
        photos: photos.map((photo) => ({
          photoId: photo._id.toString(),
          previewUrl: partyPhotoPreviewUrl(
            photo.publicId,
            photo.format as PartyPhotoFormat,
          ),
          uploadedAt: photo.uploadedAt.toISOString(),
          bytes: photo.bytes,
          width: photo.width,
          height: photo.height,
          format: photo.format,
        })),
      },
      { headers: noStore },
    );
  } catch (error) {
    return partyPhotoError(error, "Admin party photo lookup failed");
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await authorizedAdmin();
  if (!userId) return adminError("Não autorizado", 401);
  const { id } = await params;
  if (!ObjectId.isValid(id)) return adminError("Evento inválido", 400);

  const body = await readJsonObject(request);
  if (typeof body?.published !== "boolean") {
    return adminError("Estado de publicação inválido", 400);
  }

  try {
    if (!(await getEventById(id))) {
      return adminError("Evento não encontrado", 404);
    }
    const publication = await setPartyAlbumPublication(
      await getMongoClient(),
      await getDb(),
      {
        eventId: new ObjectId(id),
        published: body.published,
        actorId: userId,
        now: new Date(),
      },
    );
    return Response.json(
      {
        published: publication?.published === true,
        publishedAt: publication?.publishedAt?.toISOString() ?? null,
        updatedAt: publication?.updatedAt.toISOString() ?? null,
      },
      { headers: noStore },
    );
  } catch (error) {
    return partyPhotoError(error, "Admin party album publication failed");
  }
}
