"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import type { ReactNode } from "react";

type GuestNavigationIcon = "home" | "individual" | "group" | "photos" | "voting";

const icons: Record<GuestNavigationIcon, ReactNode> = {
  home: (
    <>
      <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V10Z" />
    </>
  ),
  individual: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  group: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2 20a7 7 0 0 1 13.5-2M16 5a3.5 3.5 0 0 1 0 6.5M18 14a5 5 0 0 1 4 5" />
    </>
  ),
  photos: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="8.5" cy="9" r="1.5" />
      <path d="m21 15-5-5L5 20" />
    </>
  ),
  voting: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="m7 8 1.5 1.5L11 7M13 9h4M7 15l1.5 1.5L11 14M13 16h4" />
    </>
  ),
};

export default function GuestBottomNavigation({
  eventId,
  votingOpen,
  contestEntryClosed,
}: {
  eventId: string;
  votingOpen: boolean;
  contestEntryClosed: boolean;
}) {
  const pathname = usePathname();
  const eventQuery = `?eventId=${encodeURIComponent(eventId)}`;
  const sections: {
    href: string;
    label: string;
    icon: GuestNavigationIcon;
    blockedByContestClosure?: boolean;
    blockedByVotingClosure?: boolean;
  }[] = [
    { href: "/meu-halloween", label: "Início", icon: "home" },
    {
      href: "/meu-halloween/individual",
      label: "Fantasia individual",
      icon: "individual",
      blockedByContestClosure: true,
    },
    {
      href: "/meu-halloween/grupo",
      label: "Fantasia em grupo",
      icon: "group",
      blockedByContestClosure: true,
    },
    {
      href: "/meu-halloween/fotos-da-festa",
      label: "Fotos da festa",
      icon: "photos",
    },
    {
      href: "/meu-halloween/votacao",
      label: "Votação",
      icon: "voting",
      blockedByVotingClosure: true,
    },
  ];

  return (
    <nav
      aria-label="Navegação principal do portal"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-zinc-950/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(0,0,0,0.35)] backdrop-blur lg:hidden"
    >
      <ul
        className="mx-auto grid max-w-xl items-stretch"
        style={{ gridTemplateColumns: `repeat(${sections.length}, minmax(0, 1fr))` }}
      >
        {sections.map((section) => {
          const active =
            pathname === section.href ||
            (section.icon === "voting" && pathname.startsWith("/meu-halloween/votacao"));
          const inactive =
            (contestEntryClosed && section.blockedByContestClosure === true) ||
            (!votingOpen && section.blockedByVotingClosure === true);
          const className = `flex min-h-14 flex-col items-center justify-center gap-1 border-t-2 px-1 text-xl transition focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-orange-300 motion-reduce:transition-none ${
            inactive
              ? "cursor-not-allowed border-transparent text-gray-500"
              : active
                ? "border-orange-400 text-orange-300"
                : "border-transparent text-gray-300 hover:bg-white/5 hover:text-white"
          }`;
          const content = (
            <>
              <svg
                aria-hidden="true"
                className="size-6 shrink-0"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
                viewBox="0 0 24 24"
              >
                {icons[section.icon]}
              </svg>
              <span className="sr-only">{section.label}</span>
            </>
          );

          return (
            <li key={section.href}>
              {inactive ? (
                <button
                  type="button"
                  aria-disabled="true"
                  aria-current={active ? "page" : undefined}
                  aria-label={section.label}
                  onClick={() =>
                    toast.warning(
                      section.blockedByVotingClosure
                        ? "A votação não está ativa no momento."
                        : "Esta opção está indisponível porque as inscrições para o concurso estão encerradas ou congeladas.",
                    )
                  }
                  className={`${className} w-full border-x-0 border-b-0 bg-transparent p-0`}
                >
                  {content}
                </button>
              ) : (
                <Link
                  href={`${section.href}${eventQuery}`}
                  aria-current={active ? "page" : undefined}
                  aria-label={section.label}
                  className={className}
                >
                  {content}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
