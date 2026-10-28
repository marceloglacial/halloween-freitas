import { notFound } from "next/navigation";
import BackButton from "@/components/back-button";
import BackgroundVideo from "@/components/background-video";
import FeatureUnavailable from "@/components/feature-unavailable";
import { ResultList } from "@/components/results/result-list";
import { getEventBySlug, resultsArePublic } from "@/lib/events";
import { getCategoryResults } from "@/lib/results";
import { getFinalVotingRoundForCategory } from "@/lib/voting-rounds";
import { getCategoryById } from "@/util/get-categories";
import { secondaryFont } from "@/util/fonts";

export const dynamic = "force-dynamic";

export default async function ResultPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ event?: string }>;
}) {
  const [{ id }, { event: eventSlug }] = await Promise.all([
    params,
    searchParams,
  ]);
  const [category, event] = await Promise.all([
    getCategoryById(id),
    eventSlug ? getEventBySlug(eventSlug) : null,
  ]);
  if (!category || !event || category.eventId !== event._id) {
    notFound();
  }
  if (!resultsArePublic(event)) {
    return (
      <FeatureUnavailable
        title="Resultados indisponíveis"
        message="Os resultados deste evento ainda não foram publicados."
      />
    );
  }

  const round = await getFinalVotingRoundForCategory(event._id, category._id);
  const results = round
    ? await getCategoryResults(event._id, category._id, round._id.toString())
    : { users: [], totalVotes: 0 };
  const backHref = `/resultados?event=${event.slug}`;
  return (
    <main className="min-h-screen w-full overflow-hidden bg-black text-white">
      <BackButton href={backHref} floating />
      <div className="relative z-10 mx-auto min-h-screen w-full px-4 pt-24 pb-8 sm:px-8 sm:pt-28 lg:pb-12">
        {results.totalVotes > 0 && results.users.length > 0 ? (
          <ResultList
            users={results.users}
            totalVotes={results.totalVotes}
            eventTitle={event.title}
            categoryTitle={category.title}
          />
        ) : (
          <section className="@container relative isolate -mx-4 -mt-24 flex min-h-[60vh] flex-col items-center justify-center gap-4 overflow-hidden px-4 pt-16 text-center sm:-mx-8 sm:-mt-28 sm:px-8 sm:pt-20">
            <BackgroundVideo />
            <div
              aria-hidden="true"
              className="absolute inset-0 z-0 bg-black/70"
            />
            <p className="relative z-10 text-base font-medium text-orange-100 sm:text-xl">
              {event.title}
            </p>
            <h1
              className={`${secondaryFont.className} relative z-10 w-full text-center leading-tight whitespace-nowrap text-white uppercase drop-shadow-[0_2px_18px_rgba(0,0,0,0.9)]`}
              style={{
                fontSize: `clamp(1.1rem, ${170 / Math.max(category.title.length, 1)}cqi, 3.75rem)`,
              }}
            >
              {category.title}
            </h1>
            <p
              className="relative z-10 mt-3 text-lg text-orange-200 sm:text-2xl"
              role="status"
            >
              Nenhum voto nesta categoria.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
