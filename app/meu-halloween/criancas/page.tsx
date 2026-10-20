import FeatureUnavailable from "@/components/feature-unavailable";
import ContestantEntryCard from "@/components/guest/contestant-entry-card";
import GuestFlowShell from "@/components/guest/guest-flow-shell";
import JuniorEntryControls from "@/components/guest/junior-entry-controls";
import { getGuestEntriesWithPhotos } from "@/app/meu-halloween/guest-entry-data";
import { getGuestPageContext } from "@/app/meu-halloween/guest-page-context";
import { getContestEntryState } from "@/util/contest-entry-state";
import { getCategories } from "@/util/get-categories";

export const dynamic = "force-dynamic";

export default async function ChildrenCostumesPage({
  searchParams,
}: {
  searchParams: Promise<{ eventId?: string }>;
}) {
  const query = await searchParams;
  const context = await getGuestPageContext(
    query.eventId,
    "/meu-halloween/criancas",
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
  const juniorEntries = entries.filter((entry) => entry.entryType === "junior");
  const juniorCategories = categories.filter(
    (category) => category.eligibility === "junior",
  );
  const entryOpen = getContestEntryState(event, new Date()) === "open";

  return (
    <GuestFlowShell
      eventTitle={event.title}
      eventId={event._id}
      guestName={guest.fullName}
      title="Fantasias infantis"
      description="Cadastre cada criança separadamente. A categoria infantil é selecionada automaticamente. Depois, salve o título e a foto no painel de cada criança."
    >
      <section className="grid gap-4">
        {entryOpen ? (
          <JuniorEntryControls
            eventId={event._id}
            categoryAvailable={juniorCategories.length > 0}
            enabled
          />
        ) : (
          <p role="status" className="text-stone-300">
            As inscrições do concurso foram encerradas.
          </p>
        )}
        {juniorEntries.length ? (
          <div className="grid gap-4">
            {juniorEntries.map((entry) => (
              <ContestantEntryCard
                key={entry._id}
                eventId={event._id}
                entry={entry}
                photoUrl={entry.photoUrl ?? null}
                category={categories.find(
                  (category) => category._id === entry.categoryId,
                )}
                entryOpen={entryOpen}
              />
            ))}
          </div>
        ) : (
          <p className="text-stone-400">
            Nenhuma criança cadastrada nesta edição.
          </p>
        )}
      </section>
    </GuestFlowShell>
  );
}
