"use client";

import Link from "next/link";
import Image from "next/image";
import { useUser } from "@clerk/nextjs";
import { ReactNode, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import LogoutButton from "@/components/logout-button";
import {
  AdminEventSummary,
  AdminEventSelection,
  resolveAdminEvent,
} from "@/lib/admin-event-selection";

type DashboardIconName =
  "overview" | "guests" | "contest" | "voting" | "gallery" | "settings";

const sections: {
  href: string;
  label: string;
  icon: DashboardIconName;
}[] = [
  { href: "/dashboard", label: "Visão geral", icon: "overview" },
  { href: "/dashboard/convidados", label: "Convidados", icon: "guests" },
  { href: "/dashboard/concursos", label: "Concursos", icon: "contest" },
  { href: "/dashboard/votacao", label: "Votação", icon: "voting" },
  { href: "/dashboard/galeria", label: "Galeria", icon: "gallery" },
  {
    href: "/dashboard/configuracoes",
    label: "Configurações",
    icon: "settings",
  },
];
const primaryMobileSections = sections.filter(
  (section) => section.href !== "/dashboard/configuracoes",
);

const logoutButtonClassName =
  "min-h-11 w-full rounded-xl border border-red-400/30 bg-red-950/60 px-4 py-2 text-left font-semibold text-red-100 transition hover:border-red-300/50 hover:bg-red-900/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-300 motion-reduce:transition-none";

function pathWithYear(path: string, year?: number) {
  return year ? `${path}?year=${year}` : path;
}

function DashboardIcon({
  name,
  className = "size-5",
}: {
  name: DashboardIconName;
  className?: string;
}) {
  const paths: Record<DashboardIconName, ReactNode> = {
    overview: (
      <>
        <rect x="3" y="3" width="8" height="8" rx="1.5" />
        <rect x="13" y="3" width="8" height="5" rx="1.5" />
        <rect x="13" y="10" width="8" height="11" rx="1.5" />
        <rect x="3" y="13" width="8" height="8" rx="1.5" />
      </>
    ),
    guests: (
      <>
        <circle cx="9" cy="8" r="3.5" />
        <path d="M2.5 20v-1a6.5 6.5 0 0 1 13 0v1zM16 5a3.5 3.5 0 0 1 0 6.5M18 14a5 5 0 0 1 3.5 5v1" />
      </>
    ),
    contest: (
      <>
        <path d="M8 4h8l-.8 8.3a3.2 3.2 0 0 1-6.4 0L8 4ZM12 16v4M8 21h8M8 6H4v2a4 4 0 0 0 4 4M16 6h4v2a4 4 0 0 1-4 4" />
      </>
    ),
    voting: (
      <>
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <path d="m7 8 1.5 1.5L11 7M13 9h4M7 15l1.5 1.5L11 14M13 16h4" />
      </>
    ),
    gallery: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <circle cx="8.5" cy="9" r="1.5" />
        <path d="m21 15-5-5L5 20" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="m19.4 15 .1.1a1.7 1.7 0 0 1-2.4 2.4l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.2a1.7 1.7 0 0 1-3.4 0v-.2a1.7 1.7 0 0 0-2.9-1.2l-.1.1a1.7 1.7 0 1 1-2.4-2.4l.1-.1a1.7 1.7 0 0 0-1.2-2.9H4a1.7 1.7 0 0 1 0-3.4h.2a1.7 1.7 0 0 0 1.2-2.9l-.1-.1a1.7 1.7 0 1 1 2.4-2.4l.1.1a1.7 1.7 0 0 0 2.9-1.2V4a1.7 1.7 0 0 1 3.4 0v.2a1.7 1.7 0 0 0 2.9 1.2l.1-.1a1.7 1.7 0 1 1 2.4 2.4l-.1.1a1.7 1.7 0 0 0 1.2 2.9h.2a1.7 1.7 0 0 1 0 3.4h-.2a1.7 1.7 0 0 0-1.2.9Z" />
      </>
    ),
  };

  return (
    <svg
      aria-hidden="true"
      className={`${className} shrink-0`}
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

function SiteLink({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/"
      target="_blank"
      rel="noreferrer"
      className={`inline-flex min-h-11 items-center justify-center rounded-lg border border-orange-400/40 bg-orange-500/10 px-3 py-2 text-sm font-semibold whitespace-nowrap text-orange-200 transition-colors hover:bg-orange-500/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300 motion-reduce:transition-none ${className}`}
    >
      Ver site
    </Link>
  );
}

function NavigationLinks({
  pathname,
  selectedYear,
  onNavigate,
}: {
  pathname: string;
  selectedYear?: number;
  onNavigate?: () => void;
}) {
  return (
    <nav aria-label="Navegação administrativa">
      <ul className="grid gap-2">
        {sections.map((section) => {
          const active = pathname === section.href;
          return (
            <li key={section.href}>
              <Link
                href={pathWithYear(section.href, selectedYear)}
                aria-current={active ? "page" : undefined}
                onClick={onNavigate}
                className={`flex min-h-12 items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300 motion-reduce:transition-none ${
                  active
                    ? "bg-orange-500 text-black shadow-[0_0_18px_rgba(249,115,22,0.28)]"
                    : "text-gray-200 hover:bg-white/10 hover:text-white"
                }`}
              >
                <DashboardIcon name={section.icon} />
                {section.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function MobileBottomNavigation({
  pathname,
  selectedYear,
}: {
  pathname: string;
  selectedYear?: number;
}) {
  return (
    <nav
      aria-label="Navegação administrativa principal"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-zinc-950/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(0,0,0,0.35)] backdrop-blur lg:hidden"
    >
      <ul className="mx-auto grid max-w-xl grid-cols-5 items-stretch">
        {primaryMobileSections.map((section) => {
          const active = pathname === section.href;
          return (
            <li key={section.href}>
              <Link
                href={pathWithYear(section.href, selectedYear)}
                aria-current={active ? "page" : undefined}
                aria-label={section.label}
                className={`flex min-h-14 flex-col items-center justify-center gap-1 border-t-2 px-1 text-xl transition focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-orange-300 motion-reduce:transition-none ${
                  active
                    ? "border-orange-400 text-orange-300"
                    : "border-transparent text-gray-300 hover:bg-white/5 hover:text-white"
                }`}
              >
                <DashboardIcon name={section.icon} className="size-6" />
                <span className="sr-only">{section.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function EditionSelection({
  events,
  selection,
  onChange,
  className = "",
}: {
  events: AdminEventSummary[];
  selection: AdminEventSelection;
  onChange: (year: string) => void;
  className?: string;
}) {
  const dropdownRef = useRef<HTMLDetailsElement>(null);

  return (
    <div
      aria-label="Seleção de edição"
      className={`relative grid min-w-28 grid-cols-[auto_auto_auto] items-center gap-x-3 gap-y-1 ${className}`}
    >
      <span className="text-xs font-medium whitespace-nowrap text-gray-300">
        Selecionar edição
      </span>
      {selection.event ? (
        <details ref={dropdownRef} className="group relative">
          <summary
            aria-label={`Selecionar edição, ano ${selection.event.year}`}
            className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-lg border border-white/20 bg-black px-3 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300 [&::-webkit-details-marker]:hidden"
          >
            <span>{selection.event.year}</span>
            <svg
              aria-hidden="true"
              className="size-4 transition-transform group-open:rotate-180 motion-reduce:transition-none"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M5.22 7.47a.75.75 0 0 1 1.06 0L10 11.19l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 8.53a.75.75 0 0 1 0-1.06Z"
                clipRule="evenodd"
              />
            </svg>
          </summary>
          <ul className="absolute top-full left-0 z-30 mt-2 grid max-h-64 w-full gap-1 overflow-y-auto rounded-xl border border-white/15 bg-zinc-950 p-2 shadow-xl">
            {events.map((event) => (
              <li key={`${event.year}-${event.title}`}>
                <button
                  type="button"
                  aria-current={
                    event.year === selection.event?.year ? "true" : undefined
                  }
                  onClick={() => {
                    if (dropdownRef.current) dropdownRef.current.open = false;
                    onChange(String(event.year));
                  }}
                  className={`min-h-10 w-full rounded-lg px-3 py-2 text-left text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300 ${
                    event.year === selection.event?.year
                      ? "bg-orange-500 font-semibold text-black"
                      : "text-gray-200 hover:bg-white/10"
                  }`}
                >
                  {event.year}
                </button>
              </li>
            ))}
          </ul>
        </details>
      ) : (
        <span className="min-h-11 content-center text-sm text-gray-300">
          Nenhuma edição disponível
        </span>
      )}
      {selection.reason === "invalid-year" && selection.event && (
        <p
          role="status"
          className="col-span-full text-xs leading-5 text-orange-200"
        >
          O ano solicitado não existe. Exibindo {selection.event.year}.
        </p>
      )}
      {selection.reason === "latest-fallback" && selection.event && (
        <p
          role="status"
          className="col-span-full text-xs leading-5 text-gray-300"
        >
          Não há edição ativa. Exibindo a edição mais recente.
        </p>
      )}
    </div>
  );
}

export default function AdminDashboardShell({
  events,
  children,
}: {
  events: AdminEventSummary[];
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const requestedYear = searchParams.get("year") ?? undefined;
  const selection = resolveAdminEvent(events, requestedYear);
  const isSettingsPage = pathname === "/dashboard/configuracoes";
  const { isLoaded: isUserLoaded, user } = useUser();
  const firstName = user?.firstName?.trim() || "Admin";
  const currentSection =
    sections.find((section) => section.href === pathname)?.label ??
    "Administração";
  const pageTitle = selection.event
    ? "Admin | Halloween dos Freitas " +
      selection.event.year +
      " | " +
      currentSection
    : "Admin | Halloween dos Freitas | " + currentSection;
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!accountMenuOpen) return;

    function closeOnOutsideClick(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !accountMenuRef.current?.contains(event.target)
      ) {
        setAccountMenuOpen(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setAccountMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [accountMenuOpen]);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = pageTitle;

    return () => {
      document.title = previousTitle;
    };
  }, [pageTitle]);

  function changeYear(year: string) {
    router.push(`/dashboard/configuracoes?year=${encodeURIComponent(year)}`);
  }

  return (
    <div className="min-h-screen bg-black text-white lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-screen flex-col gap-6 overflow-y-auto border-r border-white/10 bg-zinc-950/95 px-5 py-6 lg:flex">
        <Link
          href={pathWithYear("/dashboard", selection.event?.year)}
          className="flex items-center gap-3 rounded-xl px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300"
        >
          <span className="text-3xl" aria-hidden="true">
            🎃
          </span>
          <span>
            <span className="block text-xs tracking-[0.18em] text-orange-300 uppercase">
              Halloween
              {selection.event && <> {selection.event.year}</>}
            </span>
          </span>
        </Link>
        <NavigationLinks
          pathname={pathname}
          selectedYear={selection.event?.year}
        />
        <LogoutButton className={`${logoutButtonClassName} mt-auto`} />
      </aside>

      <div className="min-w-0">
        <header className="border-b border-white/10 bg-zinc-950/90 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex w-full flex-col items-stretch gap-3 lg:flex-row lg:items-center lg:gap-4">
            <h1 className="sr-only text-lg font-semibold lg:not-sr-only lg:mr-auto lg:text-left lg:text-xl">
              {currentSection}
            </h1>
            <div className="ml-auto hidden items-center gap-3 lg:flex">
              {isSettingsPage && (
                <EditionSelection
                  events={events}
                  selection={selection}
                  onChange={changeYear}
                  className="grid-cols-[auto_auto]"
                />
              )}
              <SiteLink />
            </div>
            <div className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-3 lg:hidden">
              <Link
                href={pathWithYear("/dashboard", selection.event?.year)}
                className="flex min-w-0 items-center gap-2 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300"
              >
                <span aria-hidden="true">🎃</span>
                <span className="truncate font-semibold">
                  Halloween
                  {selection.event && <> {selection.event.year}</>}
                </span>
              </Link>
              <div ref={accountMenuRef} className="relative">
                <button
                  ref={menuButtonRef}
                  type="button"
                  aria-expanded={accountMenuOpen}
                  aria-controls="admin-account-menu"
                  aria-label={`Abrir menu da conta de ${firstName}`}
                  onClick={() => setAccountMenuOpen((open) => !open)}
                  className="flex min-h-11 items-center gap-2 rounded-full border border-orange-400/40 bg-white/5 py-1 pr-3 pl-1 text-sm font-semibold text-white hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300 motion-reduce:transition-none"
                >
                  <span className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-full bg-orange-500/20 text-orange-200">
                    {isUserLoaded && user?.imageUrl ? (
                      <Image
                        src={user.imageUrl}
                        alt=""
                        width={32}
                        height={32}
                        className="size-full object-cover"
                      />
                    ) : (
                      <span aria-hidden="true">{firstName.charAt(0)}</span>
                    )}
                  </span>
                  <span className="max-w-28 truncate">{firstName}</span>
                  <svg
                    aria-hidden="true"
                    className={`size-4 transition-transform motion-reduce:transition-none ${accountMenuOpen ? "rotate-180" : ""}`}
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.22 7.47a.75.75 0 0 1 1.06 0L10 11.19l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 8.53a.75.75 0 0 1 0-1.06Z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
                <div
                  id="admin-account-menu"
                  hidden={!accountMenuOpen}
                  className="absolute top-full right-0 z-40 mt-2 grid w-56 gap-2 rounded-xl border border-white/15 bg-zinc-950 p-2 shadow-xl [&[hidden]]:hidden"
                >
                  <Link
                    href={pathWithYear(
                      "/dashboard/configuracoes",
                      selection.event?.year,
                    )}
                    onClick={() => setAccountMenuOpen(false)}
                    className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-100 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300"
                  >
                    <DashboardIcon name="settings" />
                    Configurações
                  </Link>
                  <SiteLink className="w-full" />
                  <LogoutButton
                    className={logoutButtonClassName}
                    onClick={() => setAccountMenuOpen(false)}
                  />
                </div>
              </div>
              {isSettingsPage && (
                <EditionSelection
                  events={events}
                  selection={selection}
                  onChange={changeYear}
                  className="col-span-2 min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-x-2"
                />
              )}
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl px-4 pt-6 pb-24 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
      <MobileBottomNavigation
        pathname={pathname}
        selectedYear={selection.event?.year}
      />
    </div>
  );
}
