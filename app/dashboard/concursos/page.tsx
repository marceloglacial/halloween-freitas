import { authorizeAdminPage } from "@/lib/auth/admin-page";
import AdminAccessDenied from "@/components/dashboard/admin-access-denied";
import AdminSectionPlaceholder from "@/components/dashboard/admin-section-placeholder";
import { getEvents } from "@/lib/events";
import { resolveAdminEvent } from "@/lib/admin-event-selection";

export default async function ContestsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string | string[] }>;
}) {
  if (!(await authorizeAdminPage("/dashboard/concursos"))) {
    return <AdminAccessDenied />;
  }

  const [events, query] = await Promise.all([getEvents(), searchParams]);
  const requestedYear = Array.isArray(query.year) ? query.year[0] : query.year;
  const selection = resolveAdminEvent(events, requestedYear);
  const yearQuery = selection.event ? `?year=${selection.event.year}` : "";

  return (
    <AdminSectionPlaceholder
      title="Concursos"
      message="A administração dos concursos será organizada nesta área. As categorias continuam disponíveis nas configurações do evento selecionado."
      action={{
        href: `/dashboard/configuracoes${yearQuery}#categorias`,
        label: "Acessar categorias",
      }}
    />
  );
}
