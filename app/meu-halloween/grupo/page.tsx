import FeatureUnavailable from "@/components/feature-unavailable";
import ContestantEntryCard from "@/components/guest/contestant-entry-card";
import GroupEntryControls from "@/components/guest/group-entry-controls";
import GuestFlowShell from "@/components/guest/guest-flow-shell";
import { getGuestEntriesWithPhotos } from "@/app/meu-halloween/guest-entry-data";
import { getGuestPageContext } from "@/app/meu-halloween/guest-page-context";
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
  const entryOpen = getContestEntryState(event, new Date()) === "open";

  return (
    <GuestFlowShell
      eventTitle={event.title}
      eventId={event._id}
      guestName={guest.fullName}
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
            As inscrições do concurso foram encerradas.
          </p>
        ) : null}
      </section>
    </GuestFlowShell>
  );
}
