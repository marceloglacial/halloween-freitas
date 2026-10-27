"use client";

import UserImageModal from "./UserImageModal";
import UserImage from "./UserImage";
import { CrownIcon } from "./award-icons";
import { FC, JSX, useState } from "react";

interface ResultsUserProps {
  user: UserWithVotes;
  totalVotes: number;
  position: number;
  podium?: boolean;
}

const podiumColors: Record<1 | 2 | 3, { label: string; stage: string }> = {
  1: {
    label: "text-amber-200",
    stage:
      "h-24 border-amber-300/60 bg-gradient-to-b from-amber-300/35 to-orange-800/40 shadow-[0_0_30px_rgba(251,146,60,0.18)] sm:h-32",
  },
  2: {
    label: "text-slate-200",
    stage:
      "h-16 border-slate-200/45 bg-gradient-to-b from-slate-200/20 to-zinc-700/50 sm:h-24",
  },
  3: {
    label: "text-orange-200",
    stage:
      "h-12 border-orange-700/50 bg-gradient-to-b from-orange-700/30 to-amber-950/60 sm:h-20",
  },
};

const podiumWidths: Record<1 | 2 | 3, string> = {
  1: "w-full max-w-64",
  2: "w-full max-w-52",
  3: "w-full max-w-48",
};

export const ResultsUser: FC<ResultsUserProps> = ({
  user,
  totalVotes,
  position,
  podium = false,
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
        aria-label={`${position}º lugar: ${user.fullName}`}
        className="flex h-full min-w-0 flex-col items-center justify-end text-center"
      >
        <div className="relative mb-3 flex flex-col items-center sm:mb-4">
          {place === 1 && <CrownIcon />}
          <UserImage
            imageSrc={user.imageUrl}
            podiumPlace={place}
            alt={imageAlt}
            name={user.fullName}
            onClick={() => setModalOpen(true)}
          />
        </div>
        <h2 className="mb-1 max-w-full text-sm font-semibold break-words text-white sm:text-lg lg:text-xl">
          {user.fullName}
        </h2>
        <p className="text-xs text-stone-200 sm:text-sm">
          {votesLabel} <span className="text-white/50">·</span>{" "}
          {percentageLabel}
        </p>
        <div
          className={`${podiumWidths[place]} ${colors.stage} mt-3 flex flex-col items-center justify-center rounded-t-xl border-x border-t px-2 text-center shadow-lg sm:mt-4`}
        >
          <span
            className={`text-4xl leading-none font-bold sm:text-6xl ${colors.label}`}
          >
            {position}º
          </span>
          <span className="mt-1 text-xs font-semibold tracking-[0.16em] text-white/90 uppercase sm:text-sm">
            lugar
          </span>
        </div>
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
      className="min-w-0 rounded-xl border border-l-2 border-zinc-700 border-l-orange-400/80 bg-zinc-900 p-3 shadow-md shadow-black/30 sm:p-4"
    >
      <div className="flex min-w-0 items-center gap-3 sm:gap-4">
        <span className="w-10 shrink-0 text-lg font-bold text-orange-200 tabular-nums sm:text-xl">
          {position}º
        </span>
        <UserImage
          imageSrc={user.imageUrl}
          alt={imageAlt}
          name={user.fullName}
          onClick={() => setModalOpen(true)}
        />
        <h3 className="min-w-0 flex-1 text-left font-semibold break-words text-white sm:text-lg">
          {user.fullName}
        </h3>
        <div className="shrink-0 text-right text-xs sm:text-sm">
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
