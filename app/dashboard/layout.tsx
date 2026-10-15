import { ReactNode } from "react";
import AdminDashboardShell from "@/components/dashboard/admin-dashboard-shell";
import FeatureUnavailable from "@/components/feature-unavailable";
import { authorizeAdminPage } from "@/lib/auth/admin-page";
import { getEvents } from "@/lib/events";

export const dynamic = "force-dynamic";

export default async function AdminDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  if (!(await authorizeAdminPage())) {
    return (
      <FeatureUnavailable
        title="Acesso restrito"
        message="Esta área é reservada aos administradores. Sua sessão de convidado continua ativa."
      />
    );
  }

  const events = await getEvents();
  return (
    <AdminDashboardShell
      events={events.map(({ year, title, status }) => ({
        year,
        title,
        status,
      }))}
    >
      {children}
    </AdminDashboardShell>
  );
}
