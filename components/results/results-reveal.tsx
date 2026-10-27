"use client";

import { secondaryFont } from "@/util/fonts";
import BackgroundVideo from "@/components/background-video";
import { useEffect, useState } from "react";
import {
  getPodiumEntryRevealState,
  getVisiblePodiumEntries,
} from "./result-ranking";
import { ResultsUser, podiumColors } from "./results-user";
import { PumpkinIcon } from "./award-icons";
import type { PodiumPlace, RankedResult } from "./result-types";

interface ResultsRevealProps {
  categoryTitle: string;
  eventTitle: string;
  podiumPlaces: PodiumPlace[];
  podiumRevealSequence: RankedResult[];
  remainingUsers: RankedResult[];
  totalVotes: number;
}

function EmptyPodiumPlace({
  position,
  skippedByTie,
}: {
  position: 1 | 2 | 3;
  skippedByTie: boolean;
}) {
  const height =
    position === 1
      ? "h-44 sm:h-52"
      : position === 2
        ? "h-36 sm:h-44"
        : "h-28 sm:h-36";
  const border =
    position === 1
      ? "border-amber-300/30"
      : position === 2
        ? "border-slate-200/30"
        : "border-orange-700/35";

  return (
    <div
      aria-label={`${position}º lugar sem participante`}
      className="flex h-full flex-col items-center justify-end text-center"
    >
      <p className="mb-3 max-w-28 text-[0.65rem] leading-tight text-stone-300 sm:mb-4 sm:max-w-36 sm:text-sm">
        {skippedByTie ? "Colocação compartilhada acima" : "Sem participante"}
      </p>
      <div
        className={`${height} w-full max-w-52 rounded-t-xl border-x border-t ${border} flex flex-col items-center justify-center bg-black/25 px-1 py-3 sm:px-2 sm:py-4`}
      >
        <div className="text-center">
          <span className="text-3xl leading-none font-bold text-white/70 sm:text-5xl">
            {position}º
          </span>
          <span className="mt-3 block text-[0.6rem] font-semibold tracking-[0.14em] text-white/70 uppercase sm:mt-4 sm:text-xs">
            lugar
          </span>
        </div>
      </div>
    </div>
  );
}

export function ResultsReveal({
  categoryTitle,
  eventTitle,
  podiumPlaces,
  podiumRevealSequence,
  remainingUsers,
  totalVotes,
}: ResultsRevealProps) {
  const [revealStep, setRevealStep] = useState(0);
  const [remainingRevealed, setRemainingRevealed] = useState(false);
  const [announcement, setAnnouncement] = useState(
    "A revelação ainda não começou.",
  );
  const podiumRevealSteps = podiumRevealSequence.length * 2;
  const podiumComplete = revealStep >= podiumRevealSteps;
  const currentEntryIndex = Math.floor(revealStep / 2);
  const currentEntry = podiumRevealSequence[currentEntryIndex];
  const currentSubstep = revealStep % 2;
  const podiumPositions = [2, 1, 3] as const;

  useEffect(() => {
    function handleRevealKey(event: KeyboardEvent) {
      if (
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        (event.target instanceof Element &&
          event.target.closest(
            'input, select, textarea, [contenteditable="true"], [role="dialog"]',
          ))
      ) {
        return;
      }

      if (event.key === "ArrowRight" && revealStep < podiumRevealSteps) {
        event.preventDefault();
        setRevealStep((step) => step + 1);
        if (currentSubstep === 0) {
          const percentage =
            totalVotes > 0
              ? ((currentEntry.user.votes / totalVotes) * 100).toFixed(2)
              : "0.00";
          setAnnouncement(
            `Votos do ${currentEntry.position}º lugar revelados: ${currentEntry.user.votes}, ${percentage}%.`,
          );
        } else {
          setAnnouncement(
            `${currentEntry.position}º lugar revelado: ${currentEntry.user.fullName}.`,
          );
        }
      } else if (
        event.key === "ArrowRight" &&
        podiumComplete &&
        !remainingRevealed &&
        remainingUsers.length > 0
      ) {
        event.preventDefault();
        setRemainingRevealed(true);
        setAnnouncement("Demais participantes revelados.");
      } else if (event.key === "ArrowLeft" && remainingRevealed) {
        event.preventDefault();
        setRemainingRevealed(false);
        setAnnouncement("Demais participantes ocultados.");
      } else if (event.key === "ArrowLeft" && revealStep > 0) {
        event.preventDefault();
        const previousStep = revealStep - 1;
        const entry = podiumRevealSequence[Math.floor(previousStep / 2)];
        const hiddenSubstep = previousStep % 2;
        setRevealStep(previousStep);
        setAnnouncement(
          hiddenSubstep === 1
            ? `${entry.position}º lugar ocultado.`
            : `Votos do ${entry.position}º lugar ocultados.`,
        );
      }
    }

    window.addEventListener("keydown", handleRevealKey);
    return () => window.removeEventListener("keydown", handleRevealKey);
  }, [
    podiumComplete,
    podiumRevealSequence,
    podiumRevealSteps,
    remainingRevealed,
    remainingUsers.length,
    revealStep,
    currentEntry,
    currentSubstep,
    totalVotes,
  ]);

  return (
    <div role="region" aria-label="Classificação final" className="w-full">
      <section className="relative isolate -mx-4 -mt-24 overflow-hidden bg-black px-4 pt-24 sm:-mx-8 sm:-mt-28 sm:px-8 sm:pt-28">
        <BackgroundVideo />
        <div aria-hidden="true" className="absolute inset-0 z-0 bg-black/70" />
        <div className="relative z-10 mx-auto w-full max-w-6xl pt-1">
          <header className="@container mx-auto mb-8 max-w-3xl text-center sm:mb-12">
            <p className="mb-2 text-base font-medium text-orange-100 sm:mb-3 sm:text-xl">
              {eventTitle}
            </p>
            <h1
              className={`${secondaryFont.className} w-full overflow-hidden text-center leading-tight text-ellipsis whitespace-nowrap text-white uppercase drop-shadow-[0_2px_18px_rgba(0,0,0,0.9)]`}
              style={{
                fontSize: `clamp(1.1rem, ${170 / Math.max(categoryTitle.length, 1)}cqi, 3.75rem)`,
              }}
            >
              {categoryTitle}
            </h1>
          </header>

          <section aria-label="Pódio dos três primeiros colocados">
            <ol className="mx-auto grid w-full max-w-4xl grid-cols-[1fr_1.2fr_1fr] items-end gap-2 sm:gap-5">
              {podiumPositions.map((position) => {
                const place = podiumPlaces.find(
                  (item) => item.position === position,
                );
                const visibleEntries = getVisiblePodiumEntries(
                  podiumRevealSequence,
                  currentEntryIndex,
                  position,
                );

                return (
                  <li key={position} className="min-w-0">
                    {place?.entries.length ? (
                      <div className="flex h-full min-w-0 flex-col justify-end gap-3 sm:gap-4">
                        {place.entries.map(({ user }) => {
                          const entryIndex = podiumRevealSequence.findIndex(
                            (entry) => entry.user._id === user._id,
                          );
                          const revealState = getPodiumEntryRevealState(
                            entryIndex,
                            revealStep,
                            podiumRevealSequence.length,
                          );

                          return (
                            <ResultsUser
                              key={user._id}
                              podium
                              hidePodiumPlatform
                              compactPodium={place.entries.length > 1}
                              position={position}
                              user={user}
                              totalVotes={totalVotes}
                              revealBlurred={!revealState.revealed}
                              showTrophy={revealState.showTrophy}
                              showVotes={revealState.showVotes}
                              animateReveal={revealState.revealed}
                            />
                          );
                        })}
                        <div
                          className={`${podiumColors[position].stage} mt-5 flex w-full flex-col items-center justify-center rounded-t-xl border-x border-t px-2 py-3 text-center shadow-lg sm:mt-6 sm:py-4`}
                        >
                          <div className="text-center">
                            <span
                              className={`text-4xl leading-none font-bold sm:text-6xl ${podiumColors[position].label}`}
                            >
                              {position}º
                            </span>
                            <span className="mt-3 block text-xs font-semibold tracking-[0.16em] text-white/90 uppercase sm:mt-4 sm:text-sm">
                              lugar
                            </span>
                          </div>
                        </div>
                        {visibleEntries.length === 0 && (
                          <span className="sr-only">
                            {position}º lugar reservado
                          </span>
                        )}
                      </div>
                    ) : (
                      <EmptyPodiumPlace
                        position={position}
                        skippedByTie={place?.skippedByTie ?? false}
                      />
                    )}
                  </li>
                );
              })}
            </ol>
          </section>
        </div>
      </section>

      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>

      {podiumComplete && remainingRevealed && remainingUsers.length > 0 && (
        <section
          aria-labelledby="other-participants-heading"
          className="-mx-4 mt-0 border-t border-white/10 bg-black px-4 pt-8 pb-8 sm:-mx-8 sm:px-8 sm:pt-10 lg:pb-12"
        >
          <h2
            id="other-participants-heading"
            className={`${secondaryFont.className} mx-auto mb-5 flex max-w-5xl items-center justify-center gap-2 text-center text-3xl text-orange-100 sm:mb-7 sm:text-4xl`}
          >
            <PumpkinIcon />
            <span>Demais participantes</span>
          </h2>
          <ol
            aria-label={`Classificação de ${categoryTitle} em ${eventTitle}`}
            className="mx-auto grid max-w-5xl gap-3 sm:gap-4 lg:grid-cols-2"
          >
            {remainingUsers.map(({ user, position }, index) => (
              <li key={user._id}>
                <ResultsUser
                  position={position}
                  user={user}
                  totalVotes={totalVotes}
                  animateReveal
                  revealDelayMs={Math.min(index * 35, 700)}
                />
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
