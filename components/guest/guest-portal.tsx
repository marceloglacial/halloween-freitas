import Link from "next/link";
import LogoutButton from "@/components/logout-button";
import GuestEventHeaderLink from "@/components/guest/guest-event-header-link";
import { isVotingOpen } from "@/lib/events";
import { getContestEntryState } from "@/util/contest-entry-state";
import type { OwnedContestantEntry } from "@/lib/contestant-entries";

const entryStatusLabels: Record<ContestantEntryStatus, string> = {
  draft: "Inscrição em andamento",
  ready: "Inscrição concluída",
  locked: "Inscrição congelada para votação",
  withdrawn: "Inscrição retirada",
};

export default function GuestPortal({
  event,
  guestName,
  entries,
  now,
}: {
  event: HalloweenEvent;
  guestName: string;
  entries: OwnedContestantEntry[];
  now: string;
}) {
  const eventStarted =
    new Date(now).getTime() >= new Date(event.eventStartsAt).getTime();
  const votingOpen = isVotingOpen(event) && eventStarted;
  const contestEntryOpen =
    getContestEntryState(event, new Date(now)) === "open";
  const individualEntry = entries.find(
    (entry) => entry.entryType === "individual",
  );
  const groupEntry = entries.find((entry) => entry.entryType === "group");
  const eventQuery = `?eventId=${event._id}`;
  const entryStatus = (entry?: OwnedContestantEntry) =>
    entry ? entryStatusLabels[entry.status] : "Ainda não cadastrada";

  const flows = [
    {
      href: `/meu-halloween/individual${eventQuery}`,
      icon: "🧙",
      title: "Fantasia individual",
      description:
        "Seu RSVP já permite concorrer; envie a foto para confirmar a participação.",
      status:
        individualEntry || contestEntryOpen
          ? entryStatus(individualEntry)
          : "Inscrições encerradas",
    },
    {
      href: `/meu-halloween/grupo${eventQuery}`,
      icon: "👯",
      title: "Fantasia em grupo",
      description: "Cadastre o grupo e envie a foto da fantasia.",
      status:
        groupEntry || contestEntryOpen
          ? entryStatus(groupEntry)
          : "Inscrições encerradas",
    },
    {
      href: `/meu-halloween/fotos-da-festa${eventQuery}`,
      icon: "📸",
      title: "Fotos da festa",
      description: "Envie fotos gerais para o álbum da festa.",
      status: eventStarted ? "Envio disponível" : "Abre quando a festa começar",
    },
    ...(votingOpen
      ? [
          {
            href: `/meu-halloween/votacao${eventQuery}`,
            icon: "🗳️",
            title: "Votação",
            description: "Escolha uma categoria e vote nas fantasias.",
            status: "Votação aberta",
          },
        ]
      : []),
  ];

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-8 px-4 py-12 text-white sm:px-8 lg:py-16">
      <div className="flex justify-end">
        <LogoutButton className="rounded-lg border border-white/15 px-4 py-2 text-sm text-stone-300 transition hover:border-orange-300/60 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300 disabled:cursor-wait disabled:opacity-60" />
      </div>
      <header className="grid gap-3 text-center">
        <GuestEventHeaderLink eventId={event._id} eventTitle={event.title} />
        <h1 className="text-5xl lg:text-7xl">Meu Halloween</h1>
        <p className="text-lg text-stone-300">
          Olá, {guestName}. Escolha o que deseja fazer.
        </p>
      </header>

      <section aria-label="Fluxos do Meu Halloween" className="grid gap-4">
        <ul className="grid gap-4 sm:grid-cols-2">
          {flows.map((flow) => (
            <li key={flow.href}>
              <Link
                href={flow.href}
                className="grid h-full min-h-40 gap-3 rounded-2xl border border-white/10 bg-stone-900 p-5 transition hover:border-orange-300/60 hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-300"
              >
                <span className="text-3xl" aria-hidden="true">
                  {flow.icon}
                </span>
                <span className="text-xl font-semibold">{flow.title}</span>
                <span className="text-sm text-stone-300">
                  {flow.description}
                </span>
                <span className="text-sm text-orange-300">{flow.status}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <Link
        href="/"
        className="w-fit text-orange-300 underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-300"
      >
        Voltar ao início
      </Link>
    </main>
  );
}
