import { redirect } from "next/navigation";
import AdminAccessDenied from "@/components/dashboard/admin-access-denied";
import AdminSectionPlaceholder from "@/components/dashboard/admin-section-placeholder";
import { authorizeAdminPage } from "@/lib/auth/admin-page";

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
  if (!(await authorizeAdminPage())) {
    return <AdminAccessDenied />;
  }

  const query = await searchParams;
  const legacyTab = Array.isArray(query.tab) ? query.tab[0] : query.tab;
  const year = Array.isArray(query.year) ? query.year[0] : query.year;
  const destination = legacyTab && legacyTabRoutes[legacyTab];
  if (destination) {
    const params = new URLSearchParams();
    if (year) params.set("year", year);
    const suffix = params.size > 0 ? `?${params.toString()}` : "";
    redirect(`${destination}${suffix}`);
  }

  return (
    <AdminSectionPlaceholder
      title="Visão geral"
      message="O resumo do evento e as ações prioritárias serão apresentados aqui. Enquanto isso, acesse os módulos disponíveis pela navegação."
    />
  );
}
