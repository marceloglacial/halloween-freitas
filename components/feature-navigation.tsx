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
import { useAuth } from "@clerk/nextjs";
import LogoutButton from "@/components/logout-button";
import {
  type FeatureNavigationIcon,
  type FeatureNavigationItem,
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
    rsvp: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 11h18" />
      </>
    ),
    portal: (
      <>
        <path d="M12 3 4 6v5c0 5 3.4 8.5 8 10 4.6-1.5 8-5 8-10V6z" />
        <path d="M8 12h.01M16 12h.01M9 16c1.8-1.4 4.2-1.4 6 0" />
      </>
    ),
    voting: (
      <>
        <path d="M4 20v-6M10 20V9M16 20V4M22 20H2" />
      </>
    ),
    results: (
      <>
        <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9z" />
      </>
    ),
    gallery: (
      <>
        <path d="M4 7h3l2-3h6l2 3h3a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z" />
        <circle cx="12" cy="13" r="3.5" />
      </>
    ),
    "party-gallery": (
      <>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <circle cx="8.5" cy="9" r="1.5" />
        <path d="m21 15-5-5L5 20" />
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

function SignedInNavigationItem({ onNavigate }: { onNavigate?: () => void }) {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded || !isSignedIn) return null;

  return (
    <li className="shrink-0">
      <LogoutButton
        className="flex w-full items-center gap-2 rounded-full px-3 py-2 text-left text-sm text-white transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-orange-300 motion-reduce:transition-none"
        onClick={onNavigate}
      />
    </li>
  );
}

function NavigationItems({
  items,
  pathname,
  hash,
  mobile = false,
  loading = false,
  clerkEnabled,
  onNavigate,
}: {
  items: FeatureNavigationItem[];
  pathname: string;
  hash: string;
  mobile?: boolean;
  loading?: boolean;
  clerkEnabled: boolean;
  onNavigate?: () => void;
}) {
  return (
    <ul
      className={
        mobile
          ? "grid gap-1"
          : "flex items-center justify-center gap-1.5 2xl:gap-2"
      }
    >
      {loading && (
        <li className="px-3 py-2 text-sm text-orange-100" role="status">
          Carregando navegação…
        </li>
      )}
      {items.map((item) => {
        const active = isFeatureNavigationItemActive(item, pathname, hash);
        const itemClass = `flex min-h-11 items-center justify-center gap-2 rounded-full border px-3 py-2 text-sm transition-all motion-reduce:transition-none ${active ? "border-orange-500/90 bg-gradient-to-b from-orange-400/20 to-orange-600/5 text-orange-200 shadow-[inset_0_1px_0_rgba(255,220,180,0.22),0_0_12px_rgba(249,115,22,0.26)]" : "border-transparent text-white hover:bg-white/10 hover:text-orange-100 hover:shadow-[0_0_14px_rgba(249,115,22,0.16)]"} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300`;

        return (
          <li key={item.key} className="shrink-0">
            {"href" in item ? (
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                onClick={onNavigate}
                className={itemClass}
              >
                <NavigationIcon name={item.icon} />
                <span>{item.label}</span>
              </Link>
            ) : (
              <span
                aria-disabled="true"
                className={`${itemClass} cursor-not-allowed text-gray-300 hover:bg-transparent hover:text-gray-300`}
              >
                <NavigationIcon name={item.icon} />
                <span className="grid text-left leading-tight">
                  <span>{item.label}</span>
                  <span className="text-xs text-gray-400">{item.status}</span>
                </span>
              </span>
            )}
          </li>
        );
      })}
      {clerkEnabled && <SignedInNavigationItem onNavigate={onNavigate} />}
    </ul>
  );
}

export default function FeatureNavigation({
  clerkEnabled,
}: {
  clerkEnabled: boolean;
}) {
  const pathname = usePathname();
  const hash = useSyncExternalStore(subscribeToHash, getHash, () => "");
  const drawerRef = useRef<HTMLDialogElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const [event, setEvent] = useState<HalloweenEvent | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(() => new Date());
  const items = getFeatureNavigationItems(event, updatedAt);

  useEffect(() => {
    let active = true;

    async function refreshEvent() {
      try {
        const response = await fetch("/api/events/current", {
          cache: "no-store",
        });
        if (response.status === 404) {
          if (active) {
            setEvent(null);
            setUpdatedAt(new Date());
          }
          return;
        }
        if (!response.ok) return;
        const currentEvent = (await response.json()) as HalloweenEvent;
        if (active) {
          setEvent(currentEvent);
          setUpdatedAt(new Date());
        }
      } catch {
        // Keep the last known event navigation while the endpoint is unavailable.
      } finally {
        if (active) setLoaded(true);
      }
    }

    void refreshEvent();
    const interval = window.setInterval(
      refreshEvent,
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
    if (!drawerOpen && drawerRef.current?.open) {
      drawerRef.current.close();
    }
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

  function closeDrawer(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) {
      event.currentTarget.close();
      handleDrawerClose();
    }
  }

  function handleDrawerClose() {
    setDrawerOpen(false);
    menuButtonRef.current?.focus();
  }

  return (
    <>
      <header className="sticky top-0 z-50 hidden w-full justify-center pt-[max(1rem,env(safe-area-inset-top))] pb-4 xl:flex">
        <nav
          aria-label="Navegação principal"
          className="pointer-events-auto mx-auto flex w-max max-w-[calc(100vw-2rem)] items-center justify-center overflow-x-auto rounded-[2rem] border border-orange-200/65 bg-[linear-gradient(145deg,rgba(255,255,255,0.17),rgba(24,18,17,0.78)_24%,rgba(6,10,17,0.88)_72%,rgba(249,115,22,0.2))] p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.38),0_0_10px_rgba(251,146,60,0.58),0_0_30px_rgba(251,146,60,0.24),0_12px_40px_rgba(0,0,0,0.58)] backdrop-blur-2xl"
        >
          <p className="sr-only" aria-live="polite" aria-atomic="true">
            {loaded
              ? event
                ? `Edição selecionada: ${event.title}, ${event.year}.`
                : "Não há edição disponível no momento."
              : "Carregando navegação da edição."}
          </p>
          <NavigationItems
            items={items}
            pathname={pathname}
            hash={hash}
            clerkEnabled={clerkEnabled}
          />
        </nav>
      </header>

      <div className="sticky top-0 z-50 border-b border-orange-300/30 bg-[linear-gradient(110deg,rgba(255,255,255,0.1),rgba(9,9,11,0.92)_30%,rgba(9,9,11,0.88))] shadow-[0_2px_22px_rgba(249,115,22,0.16)] backdrop-blur-2xl xl:hidden">
        <div className="flex min-h-14 items-center justify-between gap-3 px-4 pt-[env(safe-area-inset-top)] sm:px-6">
          <Link
            href="/"
            className="flex min-w-0 items-center gap-2 rounded-full text-sm font-semibold text-orange-200 focus-visible:outline-2 focus-visible:outline-orange-300"
          >
            <span aria-hidden="true" className="text-xl">
              🎃
            </span>
            <span className="truncate">Halloween dos Freitas</span>
          </Link>
          <p className="sr-only" aria-live="polite" aria-atomic="true">
            {loaded
              ? event
                ? `Edição selecionada: ${event.title}, ${event.year}.`
                : "Não há edição disponível no momento."
              : "Carregando navegação da edição."}
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
              items={loaded ? items : []}
              pathname={pathname}
              hash={hash}
              mobile
              loading={!loaded}
              clerkEnabled={clerkEnabled}
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
