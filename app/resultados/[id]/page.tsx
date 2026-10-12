import { notFound } from "next/navigation";
import BackButton from "@/components/back-button";
import FeatureUnavailable from "@/components/feature-unavailable";
import { ResultList } from "@/components/results/result-list";
import { getEventBySlug, resultsArePublic } from "@/lib/events";
import { getCategoryResults } from "@/lib/results";
import { getFinalVotingRoundForCategory } from "@/lib/voting-rounds";
import { getCategoryById } from "@/util/get-categories";

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
  if (!results.users.length) {
    return (
      <main className="flex min-h-screen w-full flex-col items-center justify-center gap-8">
        <BackButton href={backHref} />
        <h1 className="px-4 text-center text-4xl lg:text-6xl">
          {category.icon} {category.title}
        </h1>
        <p
          className="px-4 text-center text-xl text-orange-300 sm:text-2xl"
          role="status"
        >
          Nenhum voto nesta categoria.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-8 text-center text-white sm:px-8 lg:py-12">
      <BackButton href={backHref} />
      <h1 className="mx-auto mt-12 mb-8 max-w-4xl text-4xl break-words lg:mt-16 lg:mb-14 lg:text-6xl">
        {category.icon} {category.title}
      </h1>
      <ResultList users={results.users} totalVotes={results.totalVotes} />
    </main>
  );
}
