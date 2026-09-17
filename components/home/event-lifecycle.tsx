"use client";

import Link from "next/link";
import { ReactNode, useEffect, useState } from "react";
import { secondaryFont } from "@/util/fonts";
import { getHomeEventState, HomeEventState } from "@/util/home-event-state";

const POLL_INTERVAL_MS = 10_000;

function VotingPanel({
  state,
}: {
  state: Exclude<HomeEventState, "pre_event" | "post_event">;
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
            href="/votacao"
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
  initialNow,
  preEventContent,
  postEventContent,
}: {
  initialEvent: HalloweenEvent | null;
  initialNow: string;
  preEventContent: ReactNode;
  postEventContent: ReactNode;
}) {
  const [event, setEvent] = useState(initialEvent);
  const [observedAt, setObservedAt] = useState(() => new Date(initialNow));

  useEffect(() => {
    let active = true;

    async function refreshEvent() {
      const checkedAt = new Date();
      try {
        const response = await fetch("/api/events/current", {
          cache: "no-store",
        });
        if (!response.ok) return;
        const currentEvent = (await response.json()) as HalloweenEvent & {
          phase: EventPhase;
        };
        if (active) setEvent(currentEvent);
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
  }, []);

  const state = getHomeEventState(event, observedAt);
  if (state === "pre_event") return preEventContent;
  if (state === "post_event") return postEventContent;
  return <VotingPanel state={state} />;
}
