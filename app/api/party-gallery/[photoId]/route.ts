import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db";
import { getEventBySlug } from "@/lib/events";
import { logServerError } from "@/lib/http";
import { partyPhotoPreviewUrl } from "@/lib/party-photos";
import { getPublicPartyPhoto } from "@/lib/party-photo-writes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = {
  "Cache-Control": "private, no-store, max-age=0",
  "CDN-Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "Content-Security-Policy": "default-src 'none'; sandbox",
};

function unavailable() {
  return Response.json(
    { error: "Esta foto não está disponível." },
    { status: 404, headers: noStore },
  );
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ photoId: string }> },
) {
  try {
    const { photoId: value } = await params;
    const url = new URL(request.url);
    const photoId = /^[a-f\d]{24}$/i.test(value) ? new ObjectId(value) : null;
    const slug = url.searchParams.get("event");
    if (
      !photoId ||
      !slug ||
      slug.length > 80 ||
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
    ) {
      return unavailable();
    }

    const event = await getEventBySlug(slug);
    if (!event) return unavailable();
    const db = await getDb();
    const photo = await getPublicPartyPhoto(
      db,
      new ObjectId(event._id),
      photoId,
    );
    if (!photo) return unavailable();

    const cloudinaryResponse = await fetch(
      partyPhotoPreviewUrl(photo.publicId, photo.format),
      { cache: "no-store" },
    );
    if (!cloudinaryResponse.ok || !cloudinaryResponse.body) {
      return Response.json(
        { error: "Não foi possível carregar esta foto." },
        { status: 502, headers: noStore },
      );
    }

    const contentType = {
      jpg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
    }[photo.format];
    return new Response(cloudinaryResponse.body, {
      headers: { ...noStore, "Content-Type": contentType },
    });
  } catch (error) {
    logServerError("Party gallery image delivery failed", error);
    return Response.json(
      { error: "Não foi possível carregar esta foto." },
      { status: 500, headers: noStore },
    );
  }
}
