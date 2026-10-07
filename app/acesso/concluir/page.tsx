import GuestAccessPage from "@/components/auth/guest-access-page";
export const dynamic = "force-dynamic";
export default function CompletionPage(props: {
  searchParams: Promise<{ eventId?: string; returnTo?: string }>;
}) {
  return <GuestAccessPage {...props} mode="complete" />;
}
