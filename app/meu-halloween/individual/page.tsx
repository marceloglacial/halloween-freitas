import FeatureUnavailable from "@/components/feature-unavailable";
import ContestantEntryCard from "@/components/guest/contestant-entry-card";
import GuestFlowShell from "@/components/guest/guest-flow-shell";
import IndividualEntryControls from "@/components/guest/individual-entry-controls";
import { getGuestEntriesWithPhotos } from "@/app/meu-halloween/guest-entry-data";
import { getGuestPageContext } from "@/app/meu-halloween/guest-page-context";
import { isVotingOpen } from "@/lib/events";
import { getContestEntryState } from "@/util/contest-entry-state";

export const dynamic = "force-dynamic";

export default async function IndividualCostumePage({
  searchParams,
}: {
  searchParams: Promise<{ eventId?: string }>;
}) {
  const query = await searchParams;
  const context = await getGuestPageContext(
    query.eventId,
    "/meu-halloween/individual",
  );
  if (!context.ok) {
    return (
      <FeatureUnavailable title={context.title} message={context.message} />
    );
  }

  const { event, guest } = context;
  const now = new Date();
  const eventStarted = now.getTime() >= new Date(event.eventStartsAt).getTime();
  const votingOpen = isVotingOpen(event) && eventStarted;
  const entryState = getContestEntryState(event, now);
  const entryOpen = entryState === "open";

  if (entryState === "closed") {
    return (
      <GuestFlowShell
        eventId={event._id}
        eventYear={event.year}
        guestName={guest.fullName}
        votingOpen={votingOpen}
        contestEntryClosed
        title="Fantasia individual"
        description=""
      >
        <p role="status" className="text-stone-300">
          {event.votingStatus === "not_started"
            ? "As inscrições para o concurso foram encerradas. Este cadastro não está disponível nesta edição."
            : "As inscrições para o concurso estão congeladas desde o início da votação. Este cadastro não está disponível nesta edição."}
        </p>
      </GuestFlowShell>
    );
  }

  const entries = await getGuestEntriesWithPhotos(event._id, guest.userId);
  const entry =
    entries.find((candidate) => candidate.entryType === "individual") ?? null;

  return (
    <GuestFlowShell
      eventId={event._id}
      eventYear={event.year}
      guestName={guest.fullName}
      votingOpen={votingOpen}
      contestEntryClosed={false}
      title="Fantasia individual"
      description=""
    >
      <section className="grid gap-5">
        {entry ? (
          <ContestantEntryCard
            eventId={event._id}
            entry={entry}
            photoUrl={entry.photoUrl ?? null}
            entryOpen={entryOpen}
          />
        ) : entryOpen ? (
          <IndividualEntryControls eventId={event._id} enabled={entryOpen} />
        ) : (
          <p role="status" className="text-stone-300">
            As inscrições ainda não foram abertas.
          </p>
        )}
      </section>
    </GuestFlowShell>
  );
}
