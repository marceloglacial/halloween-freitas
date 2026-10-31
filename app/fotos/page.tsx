import FotosPage from "@/components/pages/fotos/page";
import FeatureUnavailable from "@/components/feature-unavailable";
import { getPublicContestGalleryEntries } from "@/lib/contestant-gallery";
import { getCurrentEvent, getEvents } from "@/lib/events";

export const dynamic = "force-dynamic";

export default async function PhotosPage({
  searchParams,
}: {
  searchParams: Promise<{ event?: string }>;
}) {
  const [events, currentEvent, params] = await Promise.all([
    getEvents(),
    getCurrentEvent(),
    searchParams,
  ]);
  const selectedEvent = params.event
    ? (events.find((item) => item.slug === params.event) ?? null)
    : currentEvent;
  if (params.event && !selectedEvent) {
    return (
      <FeatureUnavailable
        title="Edição não encontrada"
        message="Escolha uma edição disponível para ver as fotos do concurso."
      />
    );
  }
  const entries = selectedEvent
    ? await getPublicContestGalleryEntries(selectedEvent._id)
    : [];
  const publicEvents = events.map(({ _id, slug, title }) => ({
    _id,
    slug,
    title,
  }));
  return (
    <FotosPage
      entries={entries}
      events={publicEvents}
      selectedEvent={
        selectedEvent
          ? {
              _id: selectedEvent._id,
              slug: selectedEvent.slug,
              title: selectedEvent.title,
            }
          : undefined
      }
      photoEventSlug={selectedEvent?.slug ?? "unavailable"}
    />
  );
}
