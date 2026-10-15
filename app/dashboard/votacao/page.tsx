import AdminEventDashboardPage from "@/components/dashboard/admin-event-dashboard-page";

export default function VotingPage({
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
      initialTab="results"
      returnBackUrl="/dashboard/votacao"
    />
  );
}
