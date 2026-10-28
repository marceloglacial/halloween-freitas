import Link from "next/link";
import BackButton from "@/components/back-button";
import BackgroundVideo from "@/components/background-video";
import FeatureUnavailable from "@/components/feature-unavailable";
import { getEvents, resultsArePublic } from "@/lib/events";
import { secondaryFont } from "@/util/fonts";
import { getCategories } from "@/util/get-categories";
import { isAdmin } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

export default async function ResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ event?: string }>;
}) {
  const allEvents = await getEvents();
  const admin = await isAdmin();
  const events = admin
    ? allEvents
    : allEvents.filter((event) => resultsArePublic(event));
  const requestedSlug = (await searchParams).event;
  const requestedEvent = requestedSlug
    ? allEvents.find((item) => item.slug === requestedSlug)
    : null;
  if (
    (requestedSlug && !requestedEvent) ||
    (requestedEvent && !admin && !resultsArePublic(requestedEvent))
  ) {
    return (
      <FeatureUnavailable
        title="Resultados indisponíveis"
        message="Os resultados deste evento ainda não foram publicados."
      />
    );
  }
  const event =
    requestedEvent ??
    events.find((item) => item.status === "active") ??
    events[0];
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
    <main className="relative isolate min-h-screen w-full overflow-hidden bg-black text-white">
      <BackgroundVideo />
      <div aria-hidden="true" className="absolute inset-0 z-0 bg-black/70" />
      <BackButton href="/" floating />
      <div className="relative z-10 mx-auto min-h-screen w-full max-w-7xl px-4 py-8 min-[2560px]:max-w-[1680px] min-[2560px]:px-12 sm:px-8 lg:py-12 xl:max-w-[1440px]">
        <header className="grid justify-items-center gap-5 pt-12 pb-10 text-center min-[2560px]:gap-7 min-[2560px]:pt-16 min-[2560px]:pb-16 sm:pb-14">
          <p className="text-orange-300 min-[2560px]:text-2xl sm:text-lg">
            {event.title}
          </p>
          <h1 className="text-5xl min-[2560px]:text-8xl lg:text-7xl">
            Resultados
          </h1>
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
          <ul className="grid grid-cols-1 gap-4 min-[2560px]:gap-10 sm:grid-cols-2 sm:gap-6 lg:grid-cols-6 lg:gap-8">
            {categories.map((category, index) => (
              <li
                key={category._id}
                className={`lg:col-span-2 ${index === categories.length - 1 && categories.length % 3 === 1 ? "lg:col-start-3" : ""}`}
              >
                <Link
                  href={`/resultados/${category._id}?event=${encodeURIComponent(event.slug)}`}
                  className={`flex min-h-24 w-full items-center justify-center gap-4 rounded-xl bg-purple-600 p-4 text-left hover:bg-purple-500 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-300 min-[2560px]:min-h-40 min-[2560px]:gap-8 min-[2560px]:p-10 sm:min-h-28 sm:gap-6 sm:p-6 xl:min-h-32 xl:p-8 ${secondaryFont.className}`}
                >
                  <span
                    className="shrink-0 text-4xl min-[2560px]:text-7xl sm:text-5xl xl:text-6xl"
                    aria-hidden="true"
                  >
                    {category.icon}
                  </span>
                  <span className="min-w-0 text-lg break-words min-[2560px]:text-3xl sm:text-xl xl:text-2xl">
                    {category.title}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
