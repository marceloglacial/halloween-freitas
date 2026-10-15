import { redirect } from "next/navigation";
import AdminAccessDenied from "@/components/dashboard/admin-access-denied";
import AdminEventOverview from "@/components/dashboard/admin-event-overview";
import { authorizeAdminPage } from "@/lib/auth/admin-page";
import { getEvents } from "@/lib/events";
import { resolveAdminEvent } from "@/lib/admin-event-selection";
import { getAdminEventOverview } from "@/lib/admin-event-overview";

const legacyTabRoutes: Record<string, string> = {
  settings: "/dashboard/configuracoes",
  guests: "/dashboard/convidados",
  results: "/dashboard/votacao",
  photos: "/dashboard/galeria",
};

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    year?: string | string[];
    tab?: string | string[];
  }>;
}) {
  if (!(await authorizeAdminPage())) return <AdminAccessDenied />;

  const query = await searchParams;
  const legacyTab = Array.isArray(query.tab) ? query.tab[0] : query.tab;
  const requestedYear = Array.isArray(query.year) ? query.year[0] : query.year;
  const destination = legacyTab && legacyTabRoutes[legacyTab];
  if (destination) {
    const params = new URLSearchParams();
    if (requestedYear) params.set("year", requestedYear);
    const suffix = params.size > 0 ? `?${params.toString()}` : "";
    redirect(`${destination}${suffix}`);
  }

  const events = await getEvents();
  const selection = resolveAdminEvent(events, requestedYear);
  if (!selection.event) {
    return (
      <section className="rounded-2xl border border-white/10 bg-stone-950/80 p-6 sm:p-8">
        <p className="text-xs font-semibold tracking-[0.2em] text-orange-300 uppercase">
          Visão geral
        </p>
        <h2 className="mt-3 text-2xl font-semibold">
          Nenhuma edição cadastrada
        </h2>
        <p className="mt-2 text-gray-300">
          Crie uma edição em Configurações para acompanhar presenças, concurso e
          votação.
        </p>
      </section>
    );
  }

  const event = events.find((item) => item.year === selection.event?.year);
  if (!event) throw new Error("SELECTED_EVENT_NOT_FOUND");
  let overview;
  try {
    overview = await getAdminEventOverview(event._id);
  } catch {
    return (
      <section
        role="alert"
        className="rounded-2xl border border-red-400/30 bg-red-950/30 p-6"
      >
        <h2 className="text-xl font-semibold">
          Não foi possível carregar a visão geral
        </h2>
        <p className="mt-2 text-sm text-gray-300">
          Os indicadores desta edição estão indisponíveis. Atualize a página
          para tentar novamente.
        </p>
      </section>
    );
  }
  return (
    <AdminEventOverview event={event} overview={overview} now={new Date()} />
  );
}
