"use client";

import Link from "next/link";
import { useAuth, useUser } from "@clerk/nextjs";
import { usePathname } from "next/navigation";

function AdminDashboardShortcut() {
  const { isLoaded, isSignedIn } = useAuth();
  const { isLoaded: isUserLoaded, user } = useUser();

  if (
    !isLoaded ||
    !isSignedIn ||
    !isUserLoaded ||
    user?.publicMetadata?.role !== "admin"
  ) {
    return null;
  }

  return (
    <Link
      href="/dashboard"
      className="fixed top-[calc(env(safe-area-inset-top)+0.75rem)] right-4 z-[60] rounded-full border border-orange-300/60 bg-zinc-950/90 px-4 py-2 text-sm font-semibold text-orange-100 shadow-[0_0_16px_rgba(249,115,22,0.22)] transition-colors hover:bg-orange-500/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300 motion-reduce:transition-none"
    >
      Admin
    </Link>
  );
}

export default function FeatureNavigation({
  clerkEnabled,
}: {
  clerkEnabled: boolean;
}) {
  const pathname = usePathname();
  const isPrivateRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/meu-halloween") ||
    pathname.startsWith("/resultados") ||
    pathname.startsWith("/votacao");

  if (!clerkEnabled || isPrivateRoute) return null;

  return <AdminDashboardShortcut />;
}
