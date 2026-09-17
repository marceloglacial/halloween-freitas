import EventDashboard from "@/components/dashboard/event-dashboard";
import { auth } from "@clerk/nextjs/server";
import { isAdmin } from "@/lib/auth/admin";
import { getEvents } from "@/lib/events";
import { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Dashboard - Halloween dos Freitas",
};

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; tab?: string }>;
}) {
  const { userId, redirectToSignIn } = await auth();
  if (!userId) redirectToSignIn({ returnBackUrl: "/dashboard" });
  if (!(await isAdmin(userId))) redirect("/logout");

  const [events, query] = await Promise.all([getEvents(), searchParams]);
  const requestedYear = Number(query.year);
  const selected =
    events.find((event) => event.year === requestedYear) ??
    events.find((event) => event.status === "active") ??
    events[0];

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 md:px-8 md:py-12">
      <EventDashboard
        initialEvents={events}
        initialYear={selected?.year}
        initialTab={query.tab === "settings" ? "settings" : "guests"}
        initialNow={new Date().toISOString()}
      />
    </main>
  );
}
