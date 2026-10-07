import GuestAccessPage from "@/components/auth/guest-access-page";
export const dynamic = "force-dynamic";
export default function SignUpPage(props: {
  searchParams: Promise<{ eventId?: string; returnTo?: string }>;
}) {
  return <GuestAccessPage {...props} mode="sign-up" />;
}
