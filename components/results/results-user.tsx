"use client";

import UserImageModal from "./UserImageModal";
import UserImage from "./UserImage";
import { FC, JSX, useState } from "react";

interface ResultsUserProps {
  user: UserWithVotes;
  totalVotes: number;
  showImage: boolean;
  position: number;
  showWinner: boolean;
}
export const ResultsUser: FC<ResultsUserProps> = (props): JSX.Element => {
  const animationClasse = props.showWinner ? "" : "animate-pulse blur-2xl";
  const [modalOpen, setModalOpen] = useState(false);
  const imageSrc = props.user.imageUrl || "halloween-freitas/apple-icon_fqkaye";

  if (props.position === 1) {
    return (
      <div className="relative">
        <div
          className={`pointer-events-none absolute inset-0 ${props.showWinner ? "hidden" : ""} z-40 flex justify-center text-[200px]`}
        >
          🥇
        </div>
        <div className={`flex flex-col items-center gap-4`}>
          <UserImage
            imageSrc={imageSrc}
            position={props.position}
            animationClasse={animationClasse}
            onClick={() => setModalOpen(true)}
          />
          <div className="grid gap-8">
            <span className={`text-7xl font-bold ${animationClasse}`}>
              {props.user.fullName}
            </span>
            <span className="mx-auto flex items-center gap-4 text-2xl">
              <span> {props.user.votes} votos</span>
              <span className="text-5xl">🥇</span>
              <span className="text-orange-400">
                {((props.user.votes / props.totalVotes) * 100).toFixed(2)}%
              </span>
            </span>
          </div>
        </div>
        <UserImageModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          imageSrc={imageSrc}
        />
      </div>
    );
  }
  return (
    <div className="flex items-center gap-4">
      <span className="w-fit">{props.position}o</span>
      <span className="w-fit">
        <UserImage
          imageSrc={imageSrc}
          position={props.position}
          animationClasse={animationClasse}
          onClick={() => setModalOpen(true)}
        />
      </span>
      <span className="w-full flex-1 text-left">{props.user.fullName}</span>
      <span className="flex w-fit gap-4">
        <span className="opacity-50">{props.user.votes} votos</span>
        <span className="text-orange-400">
          {((props.user.votes / props.totalVotes) * 100).toFixed(2)}%
        </span>
      </span>
      <UserImageModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        imageSrc={imageSrc}
      />
    </div>
  );
};
