import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db";
import { getEventBySlug } from "@/lib/events";
import { logServerError } from "@/lib/http";
import {
  getPublicPartyAlbum,
  serializePublicPartyGalleryPhoto,
} from "@/lib/party-photo-writes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = {
  "Cache-Control": "private, no-store, max-age=0",
  "CDN-Cache-Control": "no-store",
};

function errorResponse(message: string, status: number) {
  return Response.json({ error: message }, { status, headers: noStore });
}

function isValidSlug(value: string | null): value is string {
  return (
    !!value && value.length <= 80 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
  );
}

export async function GET(request: Request) {
  try {
    const slug = new URL(request.url).searchParams.get("event");
    if (!isValidSlug(slug)) return errorResponse("Edição inválida.", 400);

    const event = await getEventBySlug(slug);
    if (!event) return errorResponse("Edição não encontrada.", 404);

    const db = await getDb();
    const album = await getPublicPartyAlbum(db, new ObjectId(event._id));
    const photos = album.published
      ? album.photos.map((photo) =>
          serializePublicPartyGalleryPhoto(photo, event.slug),
        )
      : [];

    return Response.json(
      { published: album.published, photos },
      { headers: noStore },
    );
  } catch (error) {
    logServerError("Public party gallery lookup failed", error);
    return errorResponse("Não foi possível carregar o álbum da festa.", 500);
  }
}
