import EventDashboard, {
  type DashboardTab,
} from "@/components/dashboard/event-dashboard";
import AdminAccessDenied from "@/components/dashboard/admin-access-denied";
import { authorizeAdminPage } from "@/lib/auth/admin-page";
import { getEvents } from "@/lib/events";
import { resolveAdminEvent } from "@/lib/admin-event-selection";
import { getCategories } from "@/util/get-categories";

type SearchParams = Promise<{
  year?: string | string[];
  [key: string]: string | string[] | undefined;
}>;

export default async function AdminEventDashboardPage({
  searchParams,
  initialTab,
  returnBackUrl,
}: {
  searchParams: SearchParams;
  initialTab: DashboardTab;
  returnBackUrl: string;
}) {
  if (!(await authorizeAdminPage(returnBackUrl))) {
    return <AdminAccessDenied />;
  }

  const [events, query] = await Promise.all([getEvents(), searchParams]);
  const requestedYear = Array.isArray(query.year) ? query.year[0] : query.year;
  const selection = resolveAdminEvent(events, requestedYear);
  const selectedEvent = selection.event
    ? (events.find((event) => event.year === selection.event?.year) ?? null)
    : null;
  const initialCategories = selectedEvent
    ? await getCategories(selectedEvent._id)
    : [];

  return (
    <EventDashboard
      embedded
      initialEvents={events}
      initialCategories={initialCategories}
      initialYear={selectedEvent?.year}
      initialTab={initialTab}
      initialNow={new Date().toISOString()}
    />
  );
}
