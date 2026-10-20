import Link from "next/link";
import LogoutButton from "@/components/logout-button";
import GuestEventHeaderLink from "@/components/guest/guest-event-header-link";
import type { ReactNode } from "react";

export default function GuestFlowShell({
  eventTitle,
  eventId,
  guestName,
  title,
  description,
  children,
}: {
  eventTitle: string;
  eventId: string;
  guestName?: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-8 px-4 py-12 text-white sm:px-8 lg:py-16">
      <div className="flex justify-end">
        <LogoutButton className="rounded-lg border border-white/15 px-4 py-2 text-sm text-stone-300 transition hover:border-orange-300/60 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300 disabled:cursor-wait disabled:opacity-60" />
      </div>
      <header className="grid gap-3 text-center">
        <GuestEventHeaderLink eventId={eventId} eventTitle={eventTitle} />
        <h1 className="text-4xl font-semibold lg:text-6xl">{title}</h1>
        {guestName ? (
          <p className="text-lg text-stone-300">Olá, {guestName}.</p>
        ) : null}
        {description ? <p className="text-stone-300">{description}</p> : null}
      </header>

      {children}

      <Link
        href={`/meu-halloween?eventId=${eventId}`}
        className="w-fit text-orange-300 underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-300"
      >
        ← Voltar ao Meu Halloween
      </Link>
    </main>
  );
}
