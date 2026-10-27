import GuestBottomNavigation from "@/components/guest/guest-bottom-navigation";
import GuestFlowCard from "@/components/guest/guest-flow-card";
import type { GuestCardStatusTone } from "@/components/guest/guest-flow-card";
import GuestHeader from "@/components/guest/guest-header";
import { isVotingOpen } from "@/lib/events";
import { getContestEntryState } from "@/util/contest-entry-state";
import type { OwnedContestantEntry } from "@/lib/contestant-entries";

const entryStatusLabels: Record<ContestantEntryStatus, string> = {
  draft: "Inscrição em andamento",
  ready: "Inscrição confirmada",
  locked: "Inscrição congelada para votação",
  withdrawn: "Inscrição retirada",
};

type FlowStatus = {
  label: string;
  tone: GuestCardStatusTone;
};

type GuestFlow = {
  href: string;
  icon: string;
  title: string;
  description: string;
  status: FlowStatus;
  inactiveReason?: string;
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
  const contestEntryState = getContestEntryState(event, new Date(now));
  const individualEntry = entries.find(
    (entry) => entry.entryType === "individual",
  );
  const groupEntry = entries.find((entry) => entry.entryType === "group");
  const eventQuery = `?eventId=${event._id}`;
  const entryStatus = (entry?: OwnedContestantEntry): FlowStatus => {
    if (!entry) return { label: "Ainda não cadastrada", tone: "unavailable" };
    const tone: FlowStatus["tone"] =
      entry.status === "draft"
        ? "in_progress"
        : entry.status === "ready"
          ? "available"
          : "unavailable";
    return { label: entryStatusLabels[entry.status], tone };
  };
  const closedStatus: FlowStatus = {
    label:
      event.votingStatus === "not_started"
        ? "Inscrições encerradas"
        : "Inscrições congeladas",
    tone: "unavailable",
  };
  const upcomingStatus: FlowStatus = {
    label: "Inscrições em breve",
    tone: "unavailable",
  };
  const cardStatus = (entry?: OwnedContestantEntry): FlowStatus => {
    if (contestEntryState === "closed") return closedStatus;
    if (entry) return entryStatus(entry);
    return contestEntryState === "upcoming"
      ? upcomingStatus
      : { label: "Ainda não cadastrada", tone: "unavailable" };
  };
  const entryDescription = (
    entry: OwnedContestantEntry | undefined,
    entryType: "individual" | "group",
  ) => {
    if (entry?.status === "ready") {
      if (contestEntryState === "closed") {
        return "Sua inscrição está confirmada e a fantasia está pronta para participar da votação. Não é mais possível editá-la nesta edição.";
      }
      return "Sua inscrição está confirmada e a fantasia está pronta para participar da votação. Você ainda pode editá-la enquanto as inscrições estiverem abertas.";
    }
    if (entry?.status === "draft") {
      return "Finalize o cadastro e envie uma foto para confirmar sua inscrição.";
    }
    return entryType === "individual"
      ? "Cadastre sua fantasia e envie uma foto para confirmar sua inscrição no concurso."
      : "Cadastre a fantasia do grupo e envie uma foto para confirmar a inscrição no concurso.";
  };
  const inactiveReason =
    event.votingStatus === "not_started"
      ? "As inscrições para o concurso estão encerradas e esta fantasia não pode mais ser alterada."
      : "As inscrições para o concurso estão congeladas desde o início da votação e esta fantasia não pode mais ser alterada.";

  const flows: GuestFlow[] = [
    {
      href: `/meu-halloween/individual${eventQuery}`,
      icon: "🧙",
      title: "Fantasia individual",
      description: entryDescription(individualEntry, "individual"),
      status: cardStatus(individualEntry),
      inactiveReason:
        contestEntryState === "closed" ? inactiveReason : undefined,
    },
    {
      href: `/meu-halloween/grupo${eventQuery}`,
      icon: "👯",
      title: "Fantasia em grupo",
      description: entryDescription(groupEntry, "group"),
      status: cardStatus(groupEntry),
      inactiveReason:
        contestEntryState === "closed" ? inactiveReason : undefined,
    },
    {
      href: `/meu-halloween/fotos-da-festa${eventQuery}`,
      icon: "📸",
      title: "Fotos da festa",
      description: "Envie fotos gerais para o álbum da festa.",
      status: eventStarted
        ? { label: "Envio disponível", tone: "available" }
        : { label: "Abre quando a festa começar", tone: "unavailable" },
    },
    ...(votingOpen
      ? [
          {
            href: `/meu-halloween/votacao${eventQuery}`,
            icon: "🗳️",
            title: "Votação",
            description: "Escolha uma categoria e vote nas fantasias.",
            status: { label: "Votação aberta", tone: "available" as const },
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
                <GuestFlowCard
                  href={flow.href}
                  icon={flow.icon}
                  title={flow.title}
                  description={flow.description}
                  status={flow.status}
                  inactiveReason={flow.inactiveReason}
                />
              </li>
            ))}
          </ul>
        </section>
      </main>
      <GuestBottomNavigation
        eventId={event._id}
        votingOpen={votingOpen}
        contestEntryClosed={contestEntryState === "closed"}
      />
    </div>
  );
}
