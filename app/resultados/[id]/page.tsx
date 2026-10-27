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
import { TrophyIcon } from "@/components/results/award-icons";

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
    <main className="relative isolate min-h-screen w-full overflow-hidden bg-black text-white">
      <BackgroundVideo />
      <div aria-hidden="true" className="absolute inset-0 z-0 bg-black/70" />
      <BackButton href={backHref} />
      <div className="relative z-10 mx-auto min-h-screen w-full max-w-7xl px-4 pt-24 pb-8 sm:px-8 sm:pt-28 lg:pb-12">
        {results.totalVotes > 0 && results.users.length > 0 ? (
          <ResultList
            users={results.users}
            totalVotes={results.totalVotes}
            eventTitle={event.title}
            categoryTitle={category.title}
          />
        ) : (
          <section className="mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center gap-4 text-center">
            <h1
              className={`${secondaryFont.className} flex items-center justify-center gap-2 text-4xl text-white uppercase drop-shadow-[0_2px_18px_rgba(0,0,0,0.9)] sm:gap-3 sm:text-5xl lg:text-7xl`}
            >
              <TrophyIcon />
              <span>{category.title}</span>
            </h1>
            <p className="text-base font-medium text-orange-100 sm:text-xl">
              {event.title}
            </p>
            <p
              className="mt-3 text-lg text-orange-200 sm:text-2xl"
              role="status"
            >
              Nenhum voto nesta categoria.
            </p>
          </section>
        )}
        <p className="mt-10 text-center text-xs text-white/60">
          Vídeo por{" "}
          <a
            href="https://www.vecteezy.com/video/1625536-mystery-and-spooky-dark-forest-with-lightning-and-moving-clouds"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2 hover:text-white"
          >
            diizlerza
          </a>
        </p>
      </div>
    </main>
  );
}
