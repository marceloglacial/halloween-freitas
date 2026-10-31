"use client";

import Link from "next/link";
import { ReactNode, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { secondaryFont } from "@/util/fonts";
import { getHomeEventState, HomeEventState } from "@/util/home-event-state";
import { HomeCategoriesProvider } from "@/components/home/home-categories-context";

const POLL_INTERVAL_MS = 10_000;

function VotingPanel({
  state,
}: {
  state: Exclude<HomeEventState, "waiting" | "pre_event" | "post_event">;
}) {
  const content = {
    voting_soon: {
      icon: "🗳️",
      title: "Votação em breve",
      message: "A festa já começou. A votação será liberada em breve.",
      button: "Votação em breve",
    },
    voting_open: {
      icon: "👻",
      title: "Votação aberta",
      message: "Escolha suas fantasias favoritas em cada categoria.",
      button: "Votar agora",
    },
    voting_ended: {
      icon: "🏆",
      title: "Votação encerrada",
      message:
        "Os votos foram encerrados. Os resultados serão publicados em breve.",
      button: "Votação encerrada",
    },
  }[state];

  if (!content) return null;

  return (
    <section className="relative grid min-h-[28rem] place-items-center bg-black px-6 py-16 text-center lg:p-8">
      <div className="relative grid max-w-3xl gap-8 rounded-2xl bg-stone-900 p-8 lg:-top-24 lg:p-12">
        <span className="text-8xl" aria-hidden="true">
          {content.icon}
        </span>
        <div className="grid gap-4" role="status" aria-live="polite">
          <h2 className={`${secondaryFont.className} text-5xl lg:text-7xl`}>
            {content.title}
          </h2>
          <p className="text-xl text-orange-300 lg:text-2xl">
            {content.message}
          </p>
        </div>
        {state === "voting_open" ? (
          <Link
            href="/meu-halloween/votacao"
            className="mx-auto rounded-xl bg-orange-500 px-8 py-4 text-xl font-bold text-black transition hover:bg-orange-400"
          >
            {content.button}
          </Link>
        ) : (
          <button
            type="button"
            disabled
            className="mx-auto cursor-not-allowed rounded-xl bg-gray-700 px-8 py-4 text-xl font-bold text-gray-300"
          >
            {content.button}
          </button>
        )}
      </div>
    </section>
  );
}

export default function EventLifecycle({
  initialEvent,
  initialCategories,
  initialNow,
  initialRsvpOpen,
  initialContestEntryState,
  preEventContent,
  postEventContent,
  heroContent,
  footerContent,
}: {
  initialEvent: HalloweenEvent | null;
  initialCategories: Category[];
  initialNow: string;
  initialRsvpOpen: boolean;
  initialContestEntryState: ContestEntryState;
  preEventContent: ReactNode;
  postEventContent: ReactNode;
  heroContent: ReactNode;
  footerContent: ReactNode;
}) {
  const router = useRouter();
  const currentEventKey = useRef(initialEvent?._id ?? null);
  const currentRsvpOpen = useRef(initialRsvpOpen);
  const currentContestEntryState = useRef(initialContestEntryState);
  const [event, setEvent] = useState(initialEvent);
  const [categories, setCategories] = useState(initialCategories);
  const [observedAt, setObservedAt] = useState(() => new Date(initialNow));

  useEffect(() => {
    let active = true;

    async function refreshEvent() {
      const checkedAt = new Date();
      try {
        const response = await fetch("/api/events/current", {
          cache: "no-store",
        });
        if (response.status === 404) {
          if (active) {
            setEvent(null);
            setCategories([]);
            const eventChanged = currentEventKey.current !== null;
            const availabilityChanged = currentRsvpOpen.current;
            const entryStateChanged = currentContestEntryState.current !== "closed";
            currentRsvpOpen.current = false;
            currentContestEntryState.current = "closed";
            if (eventChanged) {
              currentEventKey.current = null;
            }
            if (eventChanged || availabilityChanged || entryStateChanged) router.refresh();
          }
          return;
        }
        if (!response.ok) return;
        const currentEvent = (await response.json()) as HalloweenEvent & {
          phase: EventPhase;
          registrationState: RegistrationState;
          contestEntryState: ContestEntryState;
          categories: Category[];
        };
        if (active) {
          setEvent(currentEvent);
          setCategories(currentEvent.categories);
          const eventChanged = currentEventKey.current !== currentEvent._id;
          const rsvpOpen = currentEvent.registrationState === "open";
          const availabilityChanged = currentRsvpOpen.current !== rsvpOpen;
          const entryStateChanged =
            currentContestEntryState.current !== currentEvent.contestEntryState;
          currentRsvpOpen.current = rsvpOpen;
          currentContestEntryState.current = currentEvent.contestEntryState;
          if (eventChanged) {
            currentEventKey.current = currentEvent._id;
          }
          if (eventChanged || availabilityChanged || entryStateChanged) router.refresh();
        }
      } catch {
        // Keep the last valid state and retry on the next interval.
      } finally {
        if (active) setObservedAt(checkedAt);
      }
    }

    void refreshEvent();
    const interval = window.setInterval(refreshEvent, POLL_INTERVAL_MS);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [router]);

  const state = getHomeEventState(event, observedAt);
  if (state === "voting_open") {
    return (
      <>
        {heroContent}
        <VotingPanel state="voting_open" />
        {footerContent}
      </>
    );
  }

  if (state === "voting_ended") {
    return (
      <>
        {heroContent}
        {footerContent}
      </>
    );
  }

  if (
    event?.status === "active" &&
    event.contestEntryStatus === "closed" &&
    event.votingStatus === "not_started"
  ) {
    return (
      <>
        {heroContent}
        {footerContent}
      </>
    );
  }

  const eventContent = (
    <HomeCategoriesProvider categories={categories}>
      {preEventContent}
    </HomeCategoriesProvider>
  );
  if (state === "waiting") {
    return (
      <>
        {heroContent}
        <section className="grid min-h-[28rem] place-items-center bg-black px-6 py-16 text-center">
          <div className="grid max-w-3xl gap-6">
            <span className="text-7xl" aria-hidden="true">
              🎃
            </span>
            <h2 className={`${secondaryFont.className} text-5xl lg:text-7xl`}>
              Aguardando o próximo evento
            </h2>
            <p className="text-xl text-orange-300 lg:text-2xl">
              Em breve teremos novidades. Volte para acompanhar!
            </p>
          </div>
        </section>
      </>
    );
  }
  if (state === "pre_event")
    return (
      <>
        {heroContent}
        {eventContent}
        {footerContent}
      </>
    );
  if (state === "post_event")
    return (
      <>
        {heroContent}
        {postEventContent}
        {footerContent}
      </>
    );
  if (state === "voting_soon") {
    return (
      <>
        {heroContent}
        {eventContent}
        <VotingPanel state={state} />
        {footerContent}
      </>
    );
  }
  return null;
}
