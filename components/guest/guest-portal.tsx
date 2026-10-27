import Link from "next/link";
import GuestBottomNavigation from "@/components/guest/guest-bottom-navigation";
import GuestHeader from "@/components/guest/guest-header";
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
    <div className="min-h-screen bg-black text-white">
      <GuestHeader
        eventId={event._id}
        eventYear={event.year}
        guestName={guestName}
      />

      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 pt-8 pb-24 text-white sm:px-8 lg:py-12">
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
                  <span className="text-sm text-orange-300">
                    {flow.status}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

      </main>
      <GuestBottomNavigation eventId={event._id} votingOpen={votingOpen} />
    </div>
  );
}
