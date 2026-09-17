import { notFound } from "next/navigation";
import BackButton from "@/components/back-button";
import FeatureUnavailable from "@/components/feature-unavailable";
import { ResultList } from "@/components/results/result-list";
import { getEventBySlug, resultsArePublic } from "@/lib/events";
import { getCategoryResults } from "@/lib/results";
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

  const results = await getCategoryResults(event._id, category._id);
  const backHref = `/resultados?event=${event.slug}`;
  if (!results.users.length) {
    return (
      <main className="flex min-h-screen w-full flex-col items-center justify-center gap-8">
        <BackButton href={backHref} />
        <h1 className="text-4xl lg:text-6xl">
          {category.icon} {category.title}
        </h1>
        <p className="text-2xl text-orange-400">Nenhum voto nessa categoria.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen w-full px-8 py-16 text-center">
      <BackButton href={backHref} />
      <h1 className="mt-8 mb-24 text-4xl lg:mb-32 lg:text-6xl">
        {category.icon} {category.title}
      </h1>
      <ResultList users={results.users} totalVotes={results.totalVotes} />
    </main>
  );
}
