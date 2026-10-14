"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  FeatureNavigationItem,
  getFeatureNavigationItems,
} from "@/util/feature-navigation";

const EVENT_REFRESH_INTERVAL_MS = 10_000;

function NavigationItems({
  items,
  pathname,
  mobile = false,
}: {
  items: FeatureNavigationItem[];
  pathname: string;
  mobile?: boolean;
}) {
  return (
    <ul
      className={
        mobile
          ? "grid min-w-64 gap-1 rounded-xl border border-white/15 bg-zinc-900 p-2 shadow-xl"
          : "flex flex-wrap items-center justify-end gap-x-5 gap-y-2"
      }
    >
      {items.map((item) => (
        <li key={item.key}>
          {"href" in item ? (
            <Link
              href={item.href}
              aria-current={
                pathname === item.pathname ||
                (item.pathname !== "/" &&
                  pathname.startsWith(`${item.pathname}/`))
                  ? "page"
                  : undefined
              }
              className={`block rounded-lg px-3 py-2 text-sm transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-orange-300 ${pathname === item.pathname ? "text-orange-300" : "text-white"}`}
            >
              {item.label}
            </Link>
          ) : (
            <span
              aria-disabled="true"
              className="flex flex-col rounded-lg px-3 py-2 text-sm text-gray-300"
            >
              <span>{item.label}</span>
              <span className="text-xs text-gray-400">{item.status}</span>
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

export default function FeatureNavigation() {
  const pathname = usePathname();
  const menuRef = useRef<HTMLDetailsElement>(null);
  const [event, setEvent] = useState<HalloweenEvent | null>(null);
  const [loaded, setLoaded] = useState(false);
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
    menuRef.current?.removeAttribute("open");
  }, [pathname]);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black/95 shadow-lg backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-8">
        <Link
          href="/"
          className="shrink-0 rounded-lg text-sm font-semibold text-orange-300 focus-visible:outline-2 focus-visible:outline-orange-300 sm:text-base"
        >
          Halloween dos Freitas
        </Link>
        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {loaded
            ? event
              ? `Edição selecionada: ${event.title}, ${event.year}.`
              : "Não há edição disponível no momento."
            : "Carregando navegação da edição."}
        </p>
        <nav aria-label="Navegação principal">
          <div className="hidden md:block">
            {loaded && <NavigationItems items={items} pathname={pathname} />}
          </div>
          <details
            ref={menuRef}
            className="relative md:hidden"
            onClick={(clickEvent) => {
              if ((clickEvent.target as HTMLElement).closest("a")) {
                menuRef.current?.removeAttribute("open");
              }
            }}
          >
            <summary className="cursor-pointer list-none rounded-lg border border-white/20 px-3 py-2 text-sm text-orange-200 focus-visible:outline-2 focus-visible:outline-orange-300">
              Menu <span aria-hidden="true">☰</span>
            </summary>
            <div className="absolute top-12 right-0">
              {loaded ? (
                <NavigationItems items={items} pathname={pathname} mobile />
              ) : (
                <p
                  className="min-w-64 rounded-xl border border-white/15 bg-zinc-900 p-4 text-sm text-orange-100"
                  role="status"
                >
                  Carregando navegação…
                </p>
              )}
            </div>
          </details>
        </nav>
      </div>
    </header>
  );
}
