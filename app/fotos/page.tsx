import FotosPage from "@/components/pages/fotos/page";
import { getCurrentEvent, getEvents } from "@/lib/events";
import { getPublicUsersForEvent } from "@/lib/users";

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
  const event =
    events.find((item) => item.slug === params.event) ?? currentEvent;
  const users = event ? await getPublicUsersForEvent(event._id) : [];
  return (
    <FotosPage users={users} events={events} selectedEventId={event?._id} />
  );
}
