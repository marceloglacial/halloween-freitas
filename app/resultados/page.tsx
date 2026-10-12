import Link from "next/link";
import BackButton from "@/components/back-button";
import FeatureUnavailable from "@/components/feature-unavailable";
import { getEvents, resultsArePublic } from "@/lib/events";
import { secondaryFont } from "@/util/fonts";
import { getCategories } from "@/util/get-categories";

export const dynamic = "force-dynamic";

export default async function ResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ event?: string }>;
}) {
  const allEvents = await getEvents();
  const events = allEvents.filter((event) => resultsArePublic(event));
  const requestedSlug = (await searchParams).event;
  const requestedEvent = requestedSlug
    ? allEvents.find((item) => item.slug === requestedSlug)
    : null;
  if (
    (requestedSlug && !requestedEvent) ||
    (requestedEvent && !resultsArePublic(requestedEvent))
  ) {
    return (
      <FeatureUnavailable
        title="Resultados indisponíveis"
        message="Os resultados deste evento ainda não foram publicados."
      />
    );
  }
  const event = requestedEvent ?? events[0];
  if (!event) {
    return (
      <FeatureUnavailable
        title="Resultados indisponíveis"
        message="Nenhum resultado foi publicado ainda."
      />
    );
  }
  const categories = event ? await getCategories(event._id) : [];

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-8 text-white sm:px-8 lg:py-12">
      <BackButton href="/" />
      <header className="grid justify-items-center gap-5 pt-12 pb-10 text-center sm:pb-14">
        <p className="text-5xl" aria-hidden="true">
          🏆
        </p>
        <h1 className="text-5xl lg:text-7xl">Resultados</h1>
        <p className="text-orange-300">{event.title}</p>
        {events.length > 1 ? (
          <nav
            aria-label="Edições com resultados publicados"
            className="flex flex-wrap justify-center gap-3"
          >
            {events.map((item) => (
              <Link
                key={item._id}
                href={`/resultados?event=${encodeURIComponent(item.slug)}`}
                aria-current={item._id === event._id ? "page" : undefined}
                className={`rounded-lg px-4 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300 ${item._id === event._id ? "bg-orange-500 text-black" : "bg-white/10 hover:bg-white/20"}`}
              >
                {item.title}
              </Link>
            ))}
          </nav>
        ) : null}
      </header>
      {!categories.length ? (
        <p className="py-12 text-center text-stone-300" role="status">
          Nenhum resultado publicado nesta edição.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-6 lg:gap-8">
          {categories.map((category, index) => (
            <li
              key={category._id}
              className={`lg:col-span-2 ${index === categories.length - 1 && categories.length % 3 === 1 ? "lg:col-start-3" : ""}`}
            >
              <Link
                href={`/resultados/${category._id}?event=${encodeURIComponent(event.slug)}`}
                className={`flex min-h-24 w-full items-center justify-center gap-4 rounded-xl bg-purple-600 p-4 text-left hover:bg-purple-500 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-300 sm:min-h-28 sm:gap-6 sm:p-6 ${secondaryFont.className}`}
              >
                <span
                  className="shrink-0 text-4xl sm:text-5xl"
                  aria-hidden="true"
                >
                  {category.icon}
                </span>
                <span className="min-w-0 text-lg break-words sm:text-xl">
                  {category.title}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
