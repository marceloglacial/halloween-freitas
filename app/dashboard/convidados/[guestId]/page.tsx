import AdminAccessDenied from "@/components/dashboard/admin-access-denied";
import AdminGuestDetail from "@/components/dashboard/admin-guest-detail";
import { authorizeAdminPage } from "@/lib/auth/admin-page";
import { getAdminGuestDetail } from "@/lib/admin-guest-detail";
import { getEvents } from "@/lib/events";
import { resolveAdminEvent } from "@/lib/admin-event-selection";
import { ObjectId } from "mongodb";

export default async function GuestDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ guestId: string }>;
  searchParams: Promise<{ year?: string | string[] }>;
}) {
  if (!(await authorizeAdminPage("/dashboard/convidados"))) {
    return <AdminAccessDenied />;
  }

  const [route, query, events] = await Promise.all([
    params,
    searchParams,
    getEvents(),
  ]);
  const year = Array.isArray(query.year) ? query.year[0] : query.year;
  const selection = resolveAdminEvent(events, year);
  const selectedEvent = selection.event
    ? (events.find((event) => event.year === selection.event?.year) ?? null)
    : null;
  if (!selectedEvent) {
    return (
      <section className="rounded-2xl border border-white/10 bg-stone-950/80 p-6">
        <h1 className="text-4xl text-orange-300">Convidados</h1>
        <p className="mt-3 text-gray-300">
          Crie uma edição em Configurações antes de gerenciar convidados.
        </p>
      </section>
    );
  }
  if (route.guestId !== "novo" && !ObjectId.isValid(route.guestId)) {
    return (
      <section className="rounded-2xl border border-white/10 bg-stone-950/80 p-6">
        <h1 className="text-3xl text-orange-300">Convidado não encontrado</h1>
      </section>
    );
  }
  const initialDetail =
    route.guestId === "novo"
      ? null
      : await getAdminGuestDetail(selectedEvent, route.guestId);
  if (route.guestId !== "novo" && !initialDetail) {
    return (
      <section className="rounded-2xl border border-white/10 bg-stone-950/80 p-6">
        <h1 className="text-3xl text-orange-300">Convidado não encontrado</h1>
      </section>
    );
  }

  return (
    <AdminGuestDetail
      event={selectedEvent}
      guestId={route.guestId}
      now={new Date().toISOString()}
      initialDetail={initialDetail}
    />
  );
}
