"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  type MouseEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import LogoutButton from "@/components/logout-button";
import { guestAccessUrl } from "@/util/guest-access";
import {
  type FeatureNavigationIcon,
  type FeatureNavigationItem,
  type FeatureNavigationState,
  getFeatureNavigationItems,
  isFeatureNavigationItemActive,
} from "@/util/feature-navigation";

const EVENT_REFRESH_INTERVAL_MS = 10_000;

function subscribeToHash(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

function getHash() {
  return window.location.hash;
}

function NavigationIcon({ name }: { name: FeatureNavigationIcon }) {
  const paths: Record<FeatureNavigationIcon, ReactNode> = {
    home: (
      <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z" />
    ),
    info: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v5M12 8h.01" />
      </>
    ),
    schedule: (
      <>
        <rect x="4" y="5" width="16" height="15" rx="2" />
        <path d="M8 3v4M16 3v4M4 10h16M8 14h3M8 17h6" />
      </>
    ),
    rsvp: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 11h18" />
      </>
    ),
    results: (
      <>
        <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9z" />
      </>
    ),
    "party-gallery": (
      <>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <circle cx="8.5" cy="9" r="1.5" />
        <path d="m21 15-5-5L5 20" />
      </>
    ),
    archives: (
      <>
        <path d="M4 7h16v13H4zM3 4h18v3H3zM8 11h8M8 15h8" />
      </>
    ),
    login: (
      <>
        <path d="M14 4h5a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-5" />
        <path d="M10 16l4-4-4-4M14 12H3" />
      </>
    ),
    dashboard: (
      <>
        <rect x="3" y="3" width="8" height="8" rx="1.5" />
        <rect x="13" y="3" width="8" height="5" rx="1.5" />
        <rect x="13" y="10" width="8" height="11" rx="1.5" />
        <rect x="3" y="13" width="8" height="8" rx="1.5" />
      </>
    ),
  };

  return (
    <svg
      aria-hidden="true"
      className="size-[18px] shrink-0"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      {paths[name]}
    </svg>
  );
}

function SessionNavigationAction({
  href,
  onNavigate,
}: {
  href: string | null;
  onNavigate?: () => void;
}) {
  const { isLoaded, isSignedIn } = useAuth();
  const { isLoaded: isUserLoaded, user } = useUser();

  if (isLoaded && isSignedIn) {
    return (
      <div className="flex flex-wrap items-center gap-1">
        {isUserLoaded && user?.publicMetadata?.role === "admin" && (
          <Link
            href="/dashboard"
            onClick={onNavigate}
            className="flex min-h-11 items-center justify-center gap-2 rounded-full border border-transparent px-4 py-2 text-sm text-white transition-colors hover:border-orange-300/40 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-orange-300 motion-reduce:transition-none"
          >
            <NavigationIcon name="dashboard" />
            Dashboard
          </Link>
        )}
        <LogoutButton
          className="flex min-h-11 items-center justify-center gap-2 rounded-full border border-transparent px-4 py-2 text-sm text-white transition-colors hover:border-orange-300/40 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-orange-300 motion-reduce:transition-none"
          onClick={onNavigate}
        />
      </div>
    );
  }

  if (!href) return null;
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="flex min-h-11 items-center justify-center gap-2 rounded-full px-3 py-2 text-sm text-white transition-colors hover:bg-white/10 hover:text-orange-100 focus-visible:outline-2 focus-visible:outline-orange-300 motion-reduce:transition-none"
    >
      <NavigationIcon name="login" />
      Entrar
    </Link>
  );
}

function NavigationItems({
  items,
  pathname,
  hash,
  mobile = false,
  clerkEnabled,
  signInHref,
  onNavigate,
}: {
  items: FeatureNavigationItem[];
  pathname: string;
  hash: string;
  mobile?: boolean;
  clerkEnabled: boolean;
  signInHref: string | null;
  onNavigate?: () => void;
}) {
  return (
    <ul
      className={mobile ? "grid gap-1" : "flex items-center gap-1.5 2xl:gap-2"}
    >
      {items.map((item) => {
        const active = isFeatureNavigationItemActive(item, pathname, hash);
        const itemClass = `flex min-h-11 items-center justify-center gap-2 rounded-full border px-3 py-2 text-sm transition-all motion-reduce:transition-none ${active ? "border-orange-500/90 bg-gradient-to-b from-orange-400/20 to-orange-600/5 text-orange-200 shadow-[inset_0_1px_0_rgba(255,220,180,0.22),0_0_12px_rgba(249,115,22,0.26)]" : "border-transparent text-white hover:bg-white/10 hover:text-orange-100 hover:shadow-[0_0_14px_rgba(249,115,22,0.16)]"} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300`;
        return (
          <li key={item.key} className="shrink-0">
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              onClick={onNavigate}
              className={itemClass}
            >
              <NavigationIcon name={item.icon} />
              <span>{item.label}</span>
            </Link>
          </li>
        );
      })}
      {mobile && clerkEnabled && (
        <li className="mt-2 border-t border-orange-200/20 pt-3">
          <SessionNavigationAction href={signInHref} onNavigate={onNavigate} />
        </li>
      )}
    </ul>
  );
}

function PublicFeatureNavigation({ clerkEnabled }: { clerkEnabled: boolean }) {
  const pathname = usePathname();
  const hash = useSyncExternalStore(subscribeToHash, getHash, () => "");
  const drawerRef = useRef<HTMLDialogElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const [navigation, setNavigation] = useState<FeatureNavigationState>({
    event: null,
    phase: "waiting",
    rsvpAvailable: false,
    resultsAvailable: false,
    partyAlbumEvent: null,
    olderEditionsAvailable: false,
  });
  const [loaded, setLoaded] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const items = getFeatureNavigationItems(navigation);
  const signInHref = navigation.event
    ? guestAccessUrl(
        navigation.event._id,
        `/meu-halloween?eventId=${navigation.event._id}`,
      )
    : null;

  useEffect(() => {
    let active = true;
    async function refreshNavigation() {
      try {
        const response = await fetch("/api/feature-navigation", {
          cache: "no-store",
        });
        if (!response.ok) return;
        const current = (await response.json()) as FeatureNavigationState;
        if (active) setNavigation(current);
      } catch {
        // Retain the latest server-confirmed navigation during a brief outage.
      } finally {
        if (active) setLoaded(true);
      }
    }
    void refreshNavigation();
    const interval = window.setInterval(
      refreshNavigation,
      EVENT_REFRESH_INTERVAL_MS,
    );
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (drawerOpen && drawerRef.current && !drawerRef.current.open) {
      drawerRef.current.showModal();
    }
    if (!drawerOpen && drawerRef.current?.open) drawerRef.current.close();
  }, [drawerOpen]);

  useEffect(() => {
    if (drawerOpen) {
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = previousOverflow;
      };
    }
  }, [drawerOpen]);

  useEffect(() => {
    if (drawerRef.current?.open) drawerRef.current.close();
  }, [pathname]);

  function handleDrawerClose() {
    setDrawerOpen(false);
    menuButtonRef.current?.focus();
  }

  function closeDrawer(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) {
      event.currentTarget.close();
      handleDrawerClose();
    }
  }

  const editionAnnouncement = loaded
    ? navigation.event
      ? `Edição selecionada: ${navigation.event.title}, ${navigation.event.year}.`
      : "Não há edição disponível no momento."
    : "Carregando navegação da edição.";

  const votingIsOpen =
    navigation.event?.status === "active" &&
    navigation.event.votingStatus === "open";
  const votingHasEnded =
    navigation.event?.status === "active" &&
    navigation.event.votingStatus === "ended";
  const entriesAreClosed =
    navigation.event?.status === "active" &&
    navigation.event.contestEntryStatus === "closed" &&
    navigation.event.votingStatus === "not_started";

  if (
    pathname === "/" &&
    (votingIsOpen || votingHasEnded || entriesAreClosed)
  ) {
    return null;
  }

  return (
    <>
      <div className="sticky top-0 z-50 border-b border-orange-300/30 bg-[linear-gradient(110deg,rgba(255,255,255,0.1),rgba(9,9,11,0.92)_30%,rgba(9,9,11,0.88))] shadow-[0_2px_22px_rgba(249,115,22,0.16)] backdrop-blur-2xl xl:hidden">
        <div className="flex min-h-14 items-center justify-between gap-3 px-4 pt-[env(safe-area-inset-top)] sm:px-6">
          <Link
            href="/#inicio"
            className="flex min-w-0 items-center gap-2 rounded-full text-sm font-semibold text-orange-200 focus-visible:outline-2 focus-visible:outline-orange-300"
          >
            <span aria-hidden="true" className="text-xl">
              🎃
            </span>
            <span className="truncate">Halloween dos Freitas</span>
          </Link>
          <p className="sr-only" aria-live="polite" aria-atomic="true">
            {editionAnnouncement}
          </p>
          <button
            ref={menuButtonRef}
            type="button"
            aria-label="Abrir menu de navegação"
            aria-controls="mobile-navigation-drawer"
            aria-expanded={drawerOpen}
            onClick={() => setDrawerOpen(true)}
            className="grid size-10 shrink-0 place-items-center rounded-full border border-orange-200/55 bg-[linear-gradient(145deg,rgba(255,255,255,0.14),rgba(0,0,0,0.52))] text-orange-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_0_14px_rgba(249,115,22,0.3)] transition-colors hover:bg-orange-500/10 focus-visible:outline-2 focus-visible:outline-orange-300 motion-reduce:transition-none"
          >
            <svg
              aria-hidden="true"
              className="size-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      <dialog
        ref={drawerRef}
        id="mobile-navigation-drawer"
        aria-label="Menu de navegação"
        aria-modal="true"
        onClose={handleDrawerClose}
        onCancel={(event) => {
          event.preventDefault();
          drawerRef.current?.close();
          handleDrawerClose();
        }}
        onClick={closeDrawer}
        className="fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-none w-[min(23rem,88vw)] max-w-none translate-x-full border-0 border-l border-orange-200/50 bg-[linear-gradient(145deg,rgba(36,28,24,0.96),rgba(5,7,12,0.96)_38%,rgba(8,10,15,0.94))] p-0 text-white shadow-[-12px_0_48px_rgba(0,0,0,0.58),-2px_0_24px_rgba(249,115,22,0.18)] backdrop-blur-2xl backdrop:bg-black/70 backdrop:backdrop-blur-sm open:translate-x-0 motion-safe:transition-transform motion-safe:duration-300 motion-reduce:transition-none max-sm:inset-x-3 max-sm:inset-y-auto max-sm:bottom-3 max-sm:h-auto max-sm:max-h-[75dvh] max-sm:w-auto max-sm:translate-x-0 max-sm:translate-y-full max-sm:rounded-3xl max-sm:border max-sm:border-orange-200/55 max-sm:shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_0_10px_rgba(251,146,60,0.5),0_0_32px_rgba(251,146,60,0.22),0_18px_55px_rgba(0,0,0,0.72)] max-sm:open:translate-y-0"
      >
        <div className="flex h-full flex-col overflow-y-auto px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="mb-7 flex items-center justify-between gap-3 border-b border-orange-200/20 pb-5">
            <div className="flex min-w-0 items-center gap-3">
              <span aria-hidden="true" className="text-2xl">
                🎃
              </span>
              <span className="truncate text-sm font-semibold text-orange-200">
                Halloween dos Freitas
              </span>
            </div>
            <button
              type="button"
              aria-label="Fechar menu de navegação"
              autoFocus
              onClick={() => {
                drawerRef.current?.close();
                handleDrawerClose();
              }}
              className="grid size-10 shrink-0 place-items-center rounded-full border border-orange-200/30 text-white shadow-[0_0_12px_rgba(249,115,22,0.16)] hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-orange-300"
            >
              <svg
                aria-hidden="true"
                className="size-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path strokeLinecap="round" d="m6 6 12 12M18 6 6 18" />
              </svg>
            </button>
          </div>
          <nav aria-label="Navegação principal">
            <NavigationItems
              items={items}
              pathname={pathname}
              hash={hash}
              mobile
              clerkEnabled={clerkEnabled}
              signInHref={signInHref}
              onNavigate={() => {
                drawerRef.current?.close();
                handleDrawerClose();
              }}
            />
          </nav>
        </div>
      </dialog>
    </>
  );
}

export default function FeatureNavigation({
  clerkEnabled,
}: {
  clerkEnabled: boolean;
}) {
  const pathname = usePathname();
  if (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/meu-halloween") ||
    pathname.startsWith("/resultados") ||
    pathname.startsWith("/votacao")
  ) {
    return null;
  }

  return <PublicFeatureNavigation clerkEnabled={clerkEnabled} />;
}
