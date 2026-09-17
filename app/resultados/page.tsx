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
    <main className="mx-auto max-w-6xl px-8 py-12">
      <BackButton href="/" />
      <h1 className="mx-auto mb-8 pt-16 text-center text-5xl font-bold">
        Resultados
      </h1>
      {events.length > 1 && (
        <nav aria-label="Eventos" className="mb-10 flex justify-center gap-3">
          {events.map((item) => (
            <Link
              key={item._id}
              href={`/resultados?event=${item.slug}`}
              aria-current={item._id === event?._id ? "page" : undefined}
              className={`rounded-lg px-4 py-2 ${item._id === event?._id ? "bg-orange-500 text-black" : "bg-white/10"}`}
            >
              {item.title}
            </Link>
          ))}
        </nav>
      )}
      {!categories.length ? (
        <p className="mt-4 text-center">Nenhum resultado publicado.</p>
      ) : (
        <div className="grid gap-8 lg:grid-cols-6">
          {categories.map((category, index) => (
            <Link
              href={`/resultados/${category._id}?event=${event.slug}`}
              key={category._id}
              className={`col-span-2 ${categories.length === index + 1 ? "lg:col-start-3" : ""} flex items-center justify-center gap-6 rounded-xl bg-purple-600 p-4 text-left text-3xl lg:p-6 ${secondaryFont.className}`}
            >
              <span className="text-4xl lg:text-6xl" aria-hidden="true">
                {category.icon}
              </span>
              <span className="text-xl">{category.title}</span>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
