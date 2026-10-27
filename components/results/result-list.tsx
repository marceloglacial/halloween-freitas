import React, { FC, JSX } from "react";
import { secondaryFont } from "@/util/fonts";
import BackgroundVideo from "@/components/background-video";
import { PumpkinIcon } from "./award-icons";
import { ResultsUser } from "./results-user";

interface ResultListProps extends Results {
  eventTitle: string;
  categoryTitle: string;
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
      ? "h-24 sm:h-32"
      : position === 2
        ? "h-16 sm:h-24"
        : "h-12 sm:h-20";
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
        className={`${height} w-full max-w-52 rounded-t-xl border-x border-t ${border} flex flex-col items-center justify-center bg-black/25 px-1 sm:px-2`}
      >
        <span className="text-3xl leading-none font-bold text-white/70 sm:text-5xl">
          {position}º
        </span>
        <span className="mt-1 text-[0.6rem] font-semibold tracking-[0.14em] text-white/70 uppercase sm:text-xs">
          lugar
        </span>
      </div>
    </div>
  );
}

export const ResultList: FC<ResultListProps> = ({
  users,
  totalVotes,
  eventTitle,
  categoryTitle,
}): JSX.Element => {
  const positionByVotes = new Map<number, number>();
  users.forEach((user, index) => {
    if (!positionByVotes.has(user.votes)) {
      positionByVotes.set(user.votes, index + 1);
    }
  });
  const rankedUsers = users.map((user) => ({
    user,
    position: positionByVotes.get(user.votes)!,
  }));
  const podiumPositions = [2, 1, 3] as const;
  const podiumUsers = podiumPositions.map((position) => ({
    position,
    entry: rankedUsers.find((ranked) => ranked.position === position),
  }));
  const podiumIds = new Set(
    podiumUsers.flatMap(({ entry }) => (entry ? [entry.user._id] : [])),
  );
  const remainingUsers = rankedUsers.filter(
    ({ user }) => !podiumIds.has(user._id),
  );
  const tieCounts = new Map<number, number>();
  rankedUsers.forEach(({ position }) => {
    tieCounts.set(position, (tieCounts.get(position) ?? 0) + 1);
  });
  const hasTieBefore = (position: number) =>
    rankedUsers.some(
      (ranked) =>
        ranked.position < position && (tieCounts.get(ranked.position) ?? 0) > 1,
    );

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
              className={`${secondaryFont.className} w-full text-center leading-tight whitespace-nowrap text-white uppercase drop-shadow-[0_2px_18px_rgba(0,0,0,0.9)]`}
              style={{
                fontSize: `clamp(1.1rem, ${170 / Math.max(categoryTitle.length, 1)}cqi, 3.75rem)`,
              }}
            >
              {categoryTitle}
            </h1>
          </header>

          <section aria-label="Pódio dos três primeiros colocados">
            <ol className="mx-auto grid w-full max-w-4xl grid-cols-[1fr_1.2fr_1fr] items-end gap-2 sm:gap-5">
              {podiumUsers.map(({ position, entry }) => (
                <li key={position} className="min-w-0">
                  {entry ? (
                    <ResultsUser
                      podium
                      position={entry.position}
                      user={entry.user}
                      totalVotes={totalVotes}
                    />
                  ) : (
                    <EmptyPodiumPlace
                      position={position}
                      skippedByTie={hasTieBefore(position)}
                    />
                  )}
                </li>
              ))}
            </ol>
          </section>
        </div>
      </section>

      {remainingUsers.length > 0 && (
        <section
          aria-labelledby="other-participants-heading"
          className="-mx-4 mt-0 border-t border-white/10 bg-black px-4 pt-8 sm:-mx-8 sm:px-8 sm:pt-10"
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
            {remainingUsers.map(({ user, position }) => (
              <li key={user._id}>
                <ResultsUser
                  position={position}
                  user={user}
                  totalVotes={totalVotes}
                />
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
};
