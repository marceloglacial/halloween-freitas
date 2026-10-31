import { getDb } from "@/lib/db";
import {
  getEvents,
  getRegistrationState,
  resultsArePublic,
} from "@/lib/events";
import { errorResponse, logServerError } from "@/lib/http";
import { getPublishedPartyAlbumEventIds } from "@/lib/party-photo-writes";

export async function GET() {
  try {
    const [events, db] = await Promise.all([getEvents(), getDb()]);
    const publishedAlbumEventIds = await getPublishedPartyAlbumEventIds(db);
    const activeEvent = events.find((event) => event.status === "active") ?? null;
    const event = activeEvent ?? events[0] ?? null;
    const publishedAlbumEvents = events.filter((event) =>
      publishedAlbumEventIds.has(event._id),
    );
    const albumEvent =
      (event && publishedAlbumEventIds.has(event._id) && event) ||
      publishedAlbumEvents[0] ||
      null;
    const viewedIndex = event
      ? events.findIndex((item) => item._id === event._id)
      : -1;
    const olderEditionsAvailable =
      viewedIndex >= 0 &&
      events.slice(viewedIndex + 1).some(
        (item) =>
          resultsArePublic(item) || publishedAlbumEventIds.has(item._id),
      );
    const phase = !event
      ? "waiting"
      : event.status === "archived" || event.votingStatus === "ended"
        ? "post-event"
        : "event";

    return Response.json(
      {
        event,
        phase,
        rsvpAvailable:
          phase === "event" &&
          event !== null &&
          getRegistrationState(event, new Date()) === "open",
        resultsAvailable: Boolean(event && resultsArePublic(event)),
        partyAlbumEvent: albumEvent
          ? {
              slug: albumEvent.slug,
              title: albumEvent.title,
              year: albumEvent.year,
            }
          : null,
        olderEditionsAvailable,
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
