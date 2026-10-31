import AdminEventDashboardPage from "@/components/dashboard/admin-event-dashboard-page";

export default function GuestsPage({
  searchParams,
}: {
  searchParams: Promise<{
    year?: string | string[];
    participants?: string | string[];
    [key: string]: string | string[] | undefined;
  }>;
}) {
  return (
    <AdminEventDashboardPage
      searchParams={searchParams}
      initialTab="guests"
      returnBackUrl="/dashboard/convidados"
    />
  );
}
