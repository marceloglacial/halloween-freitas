import Link from "next/link";
import BackButton from "@/components/back-button";
import FeatureUnavailable from "@/components/feature-unavailable";
import { getEvents, resultsArePublic } from "@/lib/events";
import { getDb } from "@/lib/db";
import { getPublishedPartyAlbumEventIds } from "@/lib/party-photo-writes";

export const dynamic = "force-dynamic";

export default async function PreviousEditionsPage({
  searchParams,
}: {
  searchParams: Promise<{ exclude?: string }>;
}) {
  const [{ exclude }, events, db] = await Promise.all([
    searchParams,
    getEvents(),
    getDb(),
  ]);
  const publishedAlbumEventIds = await getPublishedPartyAlbumEventIds(db);
  const editions = events.filter(
    (event) =>
      event.slug !== exclude &&
      (resultsArePublic(event) || publishedAlbumEventIds.has(event._id)),
  );

  if (!editions.length) {
    return (
      <FeatureUnavailable
        title="Edições anteriores indisponíveis"
        message="Ainda não há resultados ou galerias publicados de outras edições."
      />
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 py-8 text-white sm:px-8 lg:py-12">
      <BackButton href="/" />
      <header className="grid justify-items-center gap-4 py-12 text-center">
        <p className="text-5xl" aria-hidden="true">🎃</p>
        <h1 className="text-5xl lg:text-7xl">Edições anteriores</h1>
        <p className="max-w-2xl text-stone-300">
          Explore resultados e galerias publicados de cada edição.
        </p>
      </header>
      <ul className="grid gap-5 sm:grid-cols-2">
        {editions.map((event) => {
          const hasResults = resultsArePublic(event);
          const hasAlbum = publishedAlbumEventIds.has(event._id);
          return (
            <li
              key={event._id}
              className="grid gap-4 rounded-2xl border border-orange-200/20 bg-stone-900/80 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
            >
              <h2 className="text-2xl text-orange-200">{event.title}</h2>
              <p className="text-sm text-stone-300">Edição {event.year}</p>
              <div className="flex flex-wrap gap-3">
                {hasResults && (
                  <Link
                    href={`/resultados?event=${encodeURIComponent(event.slug)}`}
                    className="rounded-full border border-orange-300/45 px-4 py-2 text-sm text-orange-100 hover:bg-orange-500/15 focus-visible:outline-2 focus-visible:outline-orange-300"
                  >
                    Vencedores
                  </Link>
                )}
                {hasAlbum && (
                  <Link
                    href={`/album-da-festa?event=${encodeURIComponent(event.slug)}`}
                    className="rounded-full border border-orange-300/45 px-4 py-2 text-sm text-orange-100 hover:bg-orange-500/15 focus-visible:outline-2 focus-visible:outline-orange-300"
                  >
                    Galeria de fotos
                  </Link>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
