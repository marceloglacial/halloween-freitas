import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ObjectId } from "mongodb";
import { PartyGallery } from "@/components/party-gallery/party-gallery";
import { getDb } from "@/lib/db";
import { getCurrentEvent, getEvents } from "@/lib/events";
import {
  getPublicPartyAlbum,
  getPublishedPartyAlbumEventIds,
  serializePublicPartyGalleryPhoto,
} from "@/lib/party-photo-writes";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Álbum da festa - Halloween dos Freitas",
};

export default async function PartyAlbumPage({
  searchParams,
}: {
  searchParams: Promise<{ event?: string }>;
}) {
  const [events, currentEvent, params] = await Promise.all([
    getEvents(),
    getCurrentEvent(),
    searchParams,
  ]);
  const requestedEvent = params.event
    ? events.find((item) => item.slug === params.event)
    : null;
  if (params.event && !requestedEvent) notFound();

  const event = requestedEvent ?? currentEvent;
  const db = await getDb();
  const publishedEventIds = await getPublishedPartyAlbumEventIds(db);
  const publishedEvents = events
    .filter((item) => publishedEventIds.has(item._id))
    .map(({ slug, title, year }) => ({ slug, title, year }));

  const album = event
    ? await getPublicPartyAlbum(db, new ObjectId(event._id))
    : { published: false as const, photos: [] };
  const photos =
    event && album.published
      ? album.photos.map((photo) =>
          serializePublicPartyGalleryPhoto(photo, event.slug),
        )
      : [];

  return (
    <PartyGallery
      event={
        event
          ? {
              slug: event.slug,
              ...(album.published
                ? { title: event.title, year: event.year }
                : {}),
            }
          : null
      }
      published={album.published}
      initialPhotos={photos}
      publishedEvents={publishedEvents}
    />
  );
}
