"use client";

import UserImageModal from "./UserImageModal";
import UserImage from "./UserImage";
import { CrownIcon, TrophyIcon } from "./award-icons";
import { FC, JSX, useState } from "react";

interface ResultsUserProps {
  user: UserWithVotes;
  totalVotes: number;
  position: number;
  podium?: boolean;
  hidePodiumPlatform?: boolean;
  compactPodium?: boolean;
  animateReveal?: boolean;
  revealDelayMs?: number;
  revealBlurred?: boolean;
  showTrophy?: boolean;
  showVotes?: boolean;
}

export const podiumColors: Record<1 | 2 | 3, { label: string; stage: string }> =
  {
    1: {
      label: "text-amber-200",
      stage:
        "h-44 border-amber-300/60 bg-gradient-to-b from-amber-300/35 to-orange-800/40 shadow-[0_0_30px_rgba(251,146,60,0.18)] sm:h-52 xl:h-56 min-[2560px]:h-64",
    },
    2: {
      label: "text-slate-200",
      stage:
        "h-36 border-slate-200/45 bg-gradient-to-b from-slate-200/20 to-zinc-700/50 sm:h-44 xl:h-48 min-[2560px]:h-52",
    },
    3: {
      label: "text-orange-200",
      stage:
        "h-28 border-orange-700/50 bg-gradient-to-b from-orange-700/30 to-amber-950/60 sm:h-36 xl:h-40 min-[2560px]:h-44",
    },
  };

export const podiumWidths: Record<1 | 2 | 3, string> = {
  1: "w-full max-w-64 min-[2560px]:max-w-80",
  2: "w-full max-w-52 min-[2560px]:max-w-64",
  3: "w-full max-w-48 min-[2560px]:max-w-60",
};

export const ResultsUser: FC<ResultsUserProps> = ({
  user,
  totalVotes,
  position,
  podium = false,
  hidePodiumPlatform = false,
  compactPodium = false,
  animateReveal = false,
  revealDelayMs = 0,
  revealBlurred = false,
  showTrophy = !revealBlurred,
  showVotes = !revealBlurred,
}): JSX.Element => {
  const [modalOpen, setModalOpen] = useState(false);
  const percentage = totalVotes > 0 ? (user.votes / totalVotes) * 100 : 0;
  const percentageLabel = `${percentage.toFixed(2)}%`;
  const progressValue = Math.min(100, Math.max(0, percentage));
  const votesLabel = user.votes === 1 ? "1 voto" : `${user.votes} votos`;
  const imageAlt = `Foto de ${user.fullName}`;

  if (podium && position >= 1 && position <= 3) {
    const place = position as 1 | 2 | 3;
    const colors = podiumColors[place];

    return (
      <article
        aria-label={
          revealBlurred
            ? `${position}º lugar reservado`
            : `${position}º lugar: ${user.fullName}`
        }
        style={
          animateReveal ? { animationDelay: `${revealDelayMs}ms` } : undefined
        }
        className={`relative isolate flex h-full min-w-0 flex-col items-center justify-end text-center ${animateReveal && !revealBlurred ? "motion-safe:animate-[award-reveal_450ms_ease-out_both]" : ""}`}
      >
        <div className="relative mb-3 flex flex-col items-center sm:mb-4">
          {place === 1 && (
            <span
              aria-hidden="true"
              className="mb-1 flex h-6 w-8 items-center justify-center min-[2560px]:h-12 min-[2560px]:w-20 sm:h-8 sm:w-10"
            >
              {!revealBlurred && <CrownIcon />}
            </span>
          )}
          <div className="relative">
            <UserImage
              imageSrc={user.imageUrl}
              podiumPlace={place}
              compactPodium={compactPodium}
              disabled={revealBlurred}
              blurred={revealBlurred}
              alt={revealBlurred ? `Foto do ${position}º lugar` : imageAlt}
              name={revealBlurred ? `${position}º lugar` : user.fullName}
              onClick={() => setModalOpen(true)}
            />
            {revealBlurred && (
              <span
                aria-hidden="true"
                className={`absolute inset-0 z-10 flex items-center justify-center rounded-full border bg-gradient-to-br from-zinc-900/30 via-zinc-950/15 to-black/35 shadow-inner backdrop-blur-sm ${place === 1 ? "border-amber-300/80 text-amber-200" : place === 2 ? "border-slate-200/75 text-slate-100" : "border-orange-700/80 text-orange-200"}`}
              >
                {showTrophy && <TrophyIcon />}
              </span>
            )}
          </div>
        </div>
        <h2
          aria-hidden={revealBlurred || undefined}
          className={`mb-0 line-clamp-2 flex h-[2.2em] max-w-full items-center justify-center overflow-hidden text-center leading-[1.05] font-semibold break-words text-white ${compactPodium ? "text-xs min-[2560px]:text-xl sm:text-sm xl:text-base" : "text-sm min-[2560px]:text-5xl sm:text-lg lg:text-xl xl:text-2xl"} ${revealBlurred ? "text-stone-300 blur-sm select-none" : ""}`}
        >
          {revealBlurred ? "Pessoa misteriosa" : user.fullName}
        </h2>
        <p
          aria-hidden={!showVotes}
          className={`whitespace-nowrap text-stone-200 ${compactPodium ? "text-[0.65rem] min-[2560px]:text-lg sm:text-xs xl:text-sm" : "text-xs min-[2560px]:text-3xl sm:text-sm xl:text-base"} ${showVotes ? (revealBlurred ? "motion-safe:animate-[votes-reveal_400ms_ease-out_both]" : "") : "blur-sm select-none"}`}
        >
          {showVotes ? (
            <>
              {votesLabel}
              <span className="text-white/50"> · </span>
              {percentageLabel}
            </>
          ) : (
            "00 votos · 00.00%"
          )}
        </p>
        {!hidePodiumPlatform && (
          <div
            className={`${podiumWidths[place]} ${colors.stage} mt-5 flex flex-col items-center justify-center rounded-t-xl border-x border-t px-2 py-3 text-center shadow-lg sm:mt-6 sm:py-4`}
          >
            <span
              className={`text-4xl leading-none font-bold min-[2560px]:text-7xl sm:text-5xl xl:text-6xl ${colors.label}`}
            >
              {position}º
            </span>
            <span className="mt-3 block text-xs font-semibold tracking-[0.16em] text-white/90 uppercase sm:mt-4 sm:text-sm">
              lugar
            </span>
          </div>
        )}
        <UserImageModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          imageSrc={user.imageUrl ?? ""}
          imageAlt={`Foto ampliada de ${user.fullName}`}
        />
      </article>
    );
  }

  return (
    <article
      aria-label={`${position}º lugar: ${user.fullName}`}
      style={
        animateReveal ? { animationDelay: `${revealDelayMs}ms` } : undefined
      }
      className={`relative isolate min-w-0 rounded-xl border border-l-2 border-zinc-700 border-l-orange-400/80 bg-zinc-900 p-3 shadow-md shadow-black/30 min-[2560px]:p-6 sm:p-4 ${animateReveal && !revealBlurred ? "motion-safe:animate-[award-reveal_450ms_ease-out_both]" : ""}`}
    >
      <div className="flex min-w-0 items-center gap-3 sm:gap-4">
        <span className="w-10 shrink-0 text-lg font-bold text-orange-200 tabular-nums min-[2560px]:w-16 min-[2560px]:text-4xl sm:text-xl">
          {position}º
        </span>
        <UserImage
          imageSrc={user.imageUrl}
          disabled={revealBlurred}
          alt={imageAlt}
          name={user.fullName}
          onClick={() => setModalOpen(true)}
        />
        <h3 className="min-w-0 flex-1 text-left font-semibold break-words text-white min-[2560px]:text-4xl sm:text-lg">
          {user.fullName}
        </h3>
        <div className="shrink-0 text-right text-xs min-[2560px]:text-3xl sm:text-sm">
          <p className="font-semibold text-stone-100">{votesLabel}</p>
          <p className="text-orange-200">{percentageLabel}</p>
        </div>
      </div>
      <div
        className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"
        role="progressbar"
        aria-label={`Percentual de votos de ${user.fullName}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Number(progressValue.toFixed(2))}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-300 transition-[width] motion-reduce:transition-none"
          style={{ width: `${progressValue}%` }}
        />
      </div>
      <UserImageModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        imageSrc={user.imageUrl ?? ""}
        imageAlt={`Foto ampliada de ${user.fullName}`}
      />
    </article>
  );
};
