"use client";

import Link from "next/link";
import { ReactNode, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import LogoutButton from "@/components/logout-button";
import {
  AdminEventSummary,
  AdminEventSelection,
  resolveAdminEvent,
} from "@/lib/admin-event-selection";

const sections = [
  { href: "/dashboard", label: "Visão geral", icon: "🏚️" },
  { href: "/dashboard/convidados", label: "Convidados", icon: "👥" },
  { href: "/dashboard/concursos", label: "Concursos", icon: "🎭" },
  { href: "/dashboard/votacao", label: "Votação", icon: "🗳️" },
  { href: "/dashboard/galeria", label: "Galeria", icon: "📸" },
  { href: "/dashboard/configuracoes", label: "Configurações", icon: "⚙️" },
];

const logoutButtonClassName =
  "min-h-11 w-full rounded-xl border border-red-400/30 bg-red-950/60 px-4 py-2 text-left font-semibold text-red-100 transition hover:border-red-300/50 hover:bg-red-900/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-300 motion-reduce:transition-none";

function pathWithYear(path: string, year?: number) {
  return year ? `${path}?year=${year}` : path;
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
                <span aria-hidden="true" className="text-lg">
                  {section.icon}
                </span>
                {section.label}
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
      <Link
        href="/"
        target="_blank"
        rel="noreferrer"
        className="inline-flex min-h-11 items-center justify-center rounded-lg border border-orange-400/40 bg-orange-500/10 px-3 py-2 text-sm font-semibold whitespace-nowrap text-orange-200 transition-colors hover:bg-orange-500/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300 motion-reduce:transition-none"
      >
        Ver site
      </Link>
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
  const currentSection =
    sections.find((section) => section.href === pathname)?.label ??
    "Administração";
  const pageTitle = selection.event
    ? "Halloween dos Freitas " + selection.event.year + " | " + currentSection
    : "Halloween dos Freitas | " + currentSection;
  const [mobileOpen, setMobileOpen] = useState(false);
  const drawerRef = useRef<HTMLDialogElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = drawerRef.current;
    if (!dialog) return;
    if (mobileOpen && !dialog.open) dialog.showModal();
    if (!mobileOpen && dialog.open) dialog.close();
  }, [mobileOpen]);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = pageTitle;

    return () => {
      document.title = previousTitle;
    };
  }, [pageTitle]);

  function changeYear(year: string) {
    router.push(`/dashboard?year=${encodeURIComponent(year)}`);
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
            <span className="font-semibold">Admin</span>
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
          <div className="flex w-full items-center justify-start gap-4">
            <h1 className="sr-only text-lg font-semibold lg:not-sr-only lg:mr-auto lg:text-left lg:text-xl">
              {currentSection}
            </h1>
            <EditionSelection
              events={events}
              selection={selection}
              onChange={changeYear}
              className="ml-auto hidden lg:grid"
            />
            <div className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 lg:hidden">
              <Link
                href={pathWithYear("/dashboard", selection.event?.year)}
                className="flex min-w-0 items-center gap-2 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300"
              >
                <span aria-hidden="true">🎃</span>
                <span className="truncate font-semibold">
                  Halloween
                  {selection.event && <> {selection.event.year}</>} Admin
                </span>
              </Link>
              <EditionSelection
                events={events}
                selection={selection}
                onChange={changeYear}
                className="col-span-2 min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] gap-x-2"
              />
              <button
                ref={menuButtonRef}
                type="button"
                aria-haspopup="dialog"
                aria-expanded={mobileOpen}
                aria-label="Abrir menu de navegação"
                onClick={() => setMobileOpen(true)}
                className="col-start-2 row-start-1 grid size-11 place-items-center rounded-xl border border-orange-400/60 bg-white/5 text-xl text-orange-300 shadow-[0_0_16px_rgba(249,115,22,0.2)] transition hover:bg-orange-500/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300 motion-reduce:transition-none"
              >
                <span aria-hidden="true">☰</span>
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>

      <dialog
        ref={drawerRef}
        aria-labelledby="admin-drawer-title"
        onClick={(event) => {
          if (event.target === event.currentTarget) setMobileOpen(false);
        }}
        onCancel={(event) => {
          event.preventDefault();
          setMobileOpen(false);
        }}
        onClose={() => {
          setMobileOpen(false);
          menuButtonRef.current?.focus();
        }}
        className="fixed top-0 right-0 left-auto m-0 h-full max-h-full w-[min(22rem,88vw)] border-l border-orange-500/40 bg-zinc-950 p-0 text-white shadow-[-18px_0_60px_rgba(0,0,0,0.55)] backdrop:bg-black/70"
      >
        <div className="flex h-full flex-col gap-6 overflow-y-auto p-6">
          <div className="flex items-center justify-between">
            <h2 id="admin-drawer-title" className="text-lg font-semibold">
              Navegação administrativa
            </h2>
            <button
              type="button"
              aria-label="Fechar menu de navegação"
              onClick={() => setMobileOpen(false)}
              className="grid size-11 place-items-center rounded-lg border border-white/20 text-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300"
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>
          <NavigationLinks
            pathname={pathname}
            selectedYear={selection.event?.year}
            onNavigate={() => setMobileOpen(false)}
          />
          <LogoutButton
            className={`${logoutButtonClassName} mt-auto`}
            onClick={() => setMobileOpen(false)}
          />
        </div>
      </dialog>
    </div>
  );
}
