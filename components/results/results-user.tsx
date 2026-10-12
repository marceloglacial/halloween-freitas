"use client";

import UserImageModal from "./UserImageModal";
import UserImage from "./UserImage";
import { FC, JSX, useState } from "react";

interface ResultsUserProps {
  user: UserWithVotes;
  totalVotes: number;
  position: number;
}
export const ResultsUser: FC<ResultsUserProps> = (props): JSX.Element => {
  const [modalOpen, setModalOpen] = useState(false);
  const imageSrc = props.user.imageUrl || "halloween-freitas/apple-icon_fqkaye";
  const imageAlt = `Foto de ${props.user.fullName}`;
  const percentage =
    props.totalVotes > 0
      ? ((props.user.votes / props.totalVotes) * 100).toFixed(2)
      : "0.00";
  const votesLabel =
    props.user.votes === 1 ? "1 voto" : `${props.user.votes} votos`;

  if (props.position === 1) {
    return (
      <article
        aria-label={`1º lugar: ${props.user.fullName}`}
        className="grid h-full content-start justify-items-center gap-4 rounded-2xl border border-orange-400/40 bg-zinc-900 p-4 text-center sm:p-6"
      >
        <div className="flex w-full flex-col items-center gap-4">
          <UserImage
            imageSrc={imageSrc}
            position={props.position}
            alt={imageAlt}
            name={props.user.fullName}
            onClick={() => setModalOpen(true)}
          />
          <div className="grid w-full justify-items-center gap-3">
            <h2 className="max-w-full text-3xl font-bold break-words sm:text-4xl lg:text-5xl">
              {props.user.fullName}
            </h2>
            <span className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-lg sm:text-xl">
              <span>{votesLabel}</span>
              <span aria-hidden="true" className="text-3xl">
                🥇
              </span>
              <span className="font-semibold text-orange-300">
                {percentage}%
              </span>
            </span>
          </div>
        </div>
        <UserImageModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          imageSrc={imageSrc}
          imageAlt={`Foto ampliada de ${props.user.fullName}`}
        />
      </article>
    );
  }
  return (
    <article
      aria-label={`${props.position}º lugar: ${props.user.fullName}`}
      className="flex min-w-0 flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-zinc-900 p-3 sm:flex-nowrap sm:gap-4 sm:p-4"
    >
      <span className="shrink-0 text-lg font-semibold text-orange-300">
        {props.position}º
      </span>
      <span className="shrink-0">
        <UserImage
          imageSrc={imageSrc}
          position={props.position}
          alt={imageAlt}
          name={props.user.fullName}
          onClick={() => setModalOpen(true)}
        />
      </span>
      <h2 className="min-w-0 flex-1 text-left font-semibold break-words">
        {props.user.fullName}
      </h2>
      <span className="ml-auto flex items-center gap-3 text-sm sm:gap-4 sm:text-base">
        <span className="text-stone-300">{votesLabel}</span>
        <span className="font-semibold text-orange-300">{percentage}%</span>
      </span>
      <UserImageModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        imageSrc={imageSrc}
        imageAlt={`Foto ampliada de ${props.user.fullName}`}
      />
    </article>
  );
};
