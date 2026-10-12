import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db";
import { getEventBySlug } from "@/lib/events";
import { logServerError } from "@/lib/http";
import { contestPhotoPreviewUrl } from "@/lib/contestant-photos";
import { getPublicContestGalleryPhoto } from "@/lib/contestant-gallery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = {
  "Cache-Control": "private, no-store, max-age=0",
  "CDN-Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "Content-Security-Policy": "default-src 'none'; sandbox",
};

function unavailable() {
  return new Response("Esta foto não está disponível.", {
    status: 404,
    headers: noStore,
  });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ entryId: string }> },
) {
  try {
    const { entryId: value } = await params;
    const slug = new URL(request.url).searchParams.get("event");
    if (
      !/^[a-f\d]{24}$/i.test(value) ||
      !slug ||
      slug.length > 80 ||
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
    ) {
      return unavailable();
    }
    const event = await getEventBySlug(slug);
    if (!event) return unavailable();
    const photo = await getPublicContestGalleryPhoto(
      await getDb(),
      new ObjectId(event._id),
      new ObjectId(value),
    );
    if (!photo) return unavailable();

    const imageResponse = await fetch(
      contestPhotoPreviewUrl(photo.publicId, photo.format),
      { cache: "no-store" },
    );
    if (!imageResponse.ok || !imageResponse.body) {
      return new Response("Não foi possível carregar esta foto.", {
        status: 502,
        headers: noStore,
      });
    }
    return new Response(imageResponse.body, {
      headers: {
        ...noStore,
        "Content-Type":
          photo.format === "jpg" ? "image/jpeg" : `image/${photo.format}`,
      },
    });
  } catch (error) {
    logServerError("Contest gallery image delivery failed", error);
    return new Response("Não foi possível carregar esta foto.", {
      status: 500,
      headers: noStore,
    });
  }
}
