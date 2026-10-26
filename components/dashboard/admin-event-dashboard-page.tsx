import EventDashboard from "@/components/dashboard/event-dashboard";
import AdminEventGuests from "@/components/dashboard/admin-event-guests";
import AdminAccessDenied from "@/components/dashboard/admin-access-denied";
import { authorizeAdminPage } from "@/lib/auth/admin-page";
import { getEvents } from "@/lib/events";
import { resolveAdminEvent } from "@/lib/admin-event-selection";

type SearchParams = Promise<{
  year?: string | string[];
  [key: string]: string | string[] | undefined;
}>;

type AdminEventPageTab = "settings" | "guests";

export default async function AdminEventDashboardPage({
  searchParams,
  initialTab,
  returnBackUrl,
}: {
  searchParams: SearchParams;
  initialTab: AdminEventPageTab;
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
  if (initialTab === "guests") {
    if (!selectedEvent) {
      return (
        <section className="rounded-2xl border border-white/10 bg-stone-950/80 p-6">
          <h1 className="text-4xl text-orange-300 sm:text-5xl">Convidados</h1>
          <h2 className="text-xl font-semibold">Nenhuma edição selecionada</h2>
          <p className="mt-2 text-gray-300">
            Crie uma edição em Configurações antes de gerenciar convidados.
          </p>
        </section>
      );
    }
    return (
      <AdminEventGuests event={selectedEvent} now={new Date().toISOString()} />
    );
  }

  return (
    <EventDashboard
      key={`${selectedEvent?._id ?? "none"}-${initialTab}`}
      initialEvents={events}
      initialYear={selectedEvent?.year}
      initialNow={new Date().toISOString()}
    />
  );
}
