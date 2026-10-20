import FeatureUnavailable from "@/components/feature-unavailable";
import ContestantEntryCard from "@/components/guest/contestant-entry-card";
import GuestFlowShell from "@/components/guest/guest-flow-shell";
import IndividualEntryControls from "@/components/guest/individual-entry-controls";
import { getGuestEntriesWithPhotos } from "@/app/meu-halloween/guest-entry-data";
import { getGuestPageContext } from "@/app/meu-halloween/guest-page-context";
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
  const entries = await getGuestEntriesWithPhotos(event._id, guest.userId);
  const entry =
    entries.find((candidate) => candidate.entryType === "individual") ?? null;
  const entryOpen = getContestEntryState(event, new Date()) === "open";

  return (
    <GuestFlowShell
      eventTitle={event.title}
      eventId={event._id}
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
            As inscrições do concurso foram encerradas.
          </p>
        )}
      </section>
    </GuestFlowShell>
  );
}
