import FeatureUnavailable from "@/components/feature-unavailable";
import ContestantEntryCard from "@/components/guest/contestant-entry-card";
import GroupEntryControls from "@/components/guest/group-entry-controls";
import GuestFlowShell from "@/components/guest/guest-flow-shell";
import { getGuestEntriesWithPhotos } from "@/app/meu-halloween/guest-entry-data";
import { getGuestPageContext } from "@/app/meu-halloween/guest-page-context";
import { isVotingOpen } from "@/lib/events";
import { getContestEntryState } from "@/util/contest-entry-state";
import { getCategories } from "@/util/get-categories";

export const dynamic = "force-dynamic";

export default async function GroupCostumePage({
  searchParams,
}: {
  searchParams: Promise<{ eventId?: string }>;
}) {
  const query = await searchParams;
  const context = await getGuestPageContext(
    query.eventId,
    "/meu-halloween/grupo",
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
        title="Fantasia em grupo"
        description="Informe o nome da fantasia do grupo. A categoria compatível é selecionada automaticamente; depois, envie a foto no painel."
      >
        <p role="status" className="text-stone-300">
          {event.votingStatus === "not_started"
            ? "As inscrições para o concurso foram encerradas. Este cadastro não está disponível nesta edição."
            : "As inscrições para o concurso estão congeladas desde o início da votação. Este cadastro não está disponível nesta edição."}
        </p>
      </GuestFlowShell>
    );
  }

  const [entries, categories] = await Promise.all([
    getGuestEntriesWithPhotos(event._id, guest.userId),
    getCategories(event._id),
  ]);
  const entry =
    entries.find((candidate) => candidate.entryType === "group") ?? null;
  const groupCategories = categories.filter(
    (category) => category.eligibility === "group",
  );
  const category = entry
    ? categories.find((item) => item._id === entry.categoryId)
    : undefined;

  return (
    <GuestFlowShell
      eventId={event._id}
      eventYear={event.year}
      guestName={guest.fullName}
      votingOpen={votingOpen}
      contestEntryClosed={false}
      title="Fantasia em grupo"
      description="Informe o nome da fantasia do grupo. A categoria compatível é selecionada automaticamente; depois, envie a foto no painel."
    >
      <section className="grid gap-4">
        <GroupEntryControls
          eventId={event._id}
          categoryAvailable={groupCategories.length > 0}
          entry={entry}
          enabled={entryOpen}
        />
        {entry ? (
          <ContestantEntryCard
            eventId={event._id}
            entry={entry}
            photoUrl={entry.photoUrl ?? null}
            category={category}
            entryOpen={entryOpen}
          />
        ) : !entryOpen ? (
          <p role="status" className="text-stone-300">
            As inscrições do concurso ainda não foram abertas.
          </p>
        ) : null}
      </section>
    </GuestFlowShell>
  );
}
