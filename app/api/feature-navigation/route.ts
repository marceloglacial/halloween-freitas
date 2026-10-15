import { getDb } from "@/lib/db";
import { getEvents } from "@/lib/events";
import { errorResponse, logServerError } from "@/lib/http";
import { getPublishedPartyAlbumEventIds } from "@/lib/party-photo-writes";

export async function GET() {
  try {
    const [events, db] = await Promise.all([getEvents(), getDb()]);
    const publishedAlbumEventIds = await getPublishedPartyAlbumEventIds(db);
    const activeEvent = events.find((event) => event.status === "active") ?? null;
    const publishedAlbumEvents = events.filter((event) =>
      publishedAlbumEventIds.has(event._id),
    );
    const albumEvent =
      (activeEvent &&
        publishedAlbumEventIds.has(activeEvent._id) &&
        activeEvent) ||
      publishedAlbumEvents[0] ||
      null;

    return Response.json(
      {
        event: activeEvent,
        partyAlbumEvent: albumEvent
          ? {
              slug: albumEvent.slug,
              title: albumEvent.title,
              year: albumEvent.year,
            }
          : null,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    logServerError("Feature navigation lookup failed", error);
    const response = errorResponse(
      "Não foi possível carregar a navegação",
      500,
    );
    response.headers.set("Cache-Control", "no-store");
    return response;
  }
}
