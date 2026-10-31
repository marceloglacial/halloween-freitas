import AdminEventDashboardPage from "@/components/dashboard/admin-event-dashboard-page";

export default function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{
    year?: string | string[];
    [key: string]: string | string[] | undefined;
  }>;
}) {
  return (
    <AdminEventDashboardPage
      searchParams={searchParams}
      initialTab="settings"
      returnBackUrl="/dashboard/configuracoes"
    />
  );
}
