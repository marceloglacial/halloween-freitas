"use client";

import { CldImage } from "next-cloudinary";
import { FC, JSX } from "react";

interface ResultsUserProps {
  user: UserWithVotes;
  totalVotes: number;
  showImage: boolean;
  position: number;
  showWinner: boolean;
}
export const ResultsUser: FC<ResultsUserProps> = (props): JSX.Element => {
  const animationClasse = props.showWinner ? "" : "animate-pulse blur-2xl";
  if (props.position === 1) {
    return (
      <div className="relative">
        <div
          className={`pointer-events-none absolute inset-0 ${props.showWinner ? "hidden" : ""} z-40 flex justify-center text-[200px]`}
        >
          🥇
        </div>
        <div className={`flex flex-col items-center gap-4`}>
          <CldImage
            src={props.user.imageUrl || "halloween-freitas/apple-icon_fqkaye"}
            width={900}
            height={600}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            alt="User Image"
            className={`h-68 w-68 rounded-full border-8 border-orange-400 object-cover ${animationClasse}`}
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
      </div>
    );
  }
  return (
    <div className="flex items-center gap-4">
      <span className="w-fit">{props.position}o</span>
      <span className="w-fit">
        <CldImage
          src={props.user.imageUrl || "halloween-freitas/apple-icon_fqkaye"}
          width={900}
          height={600}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          alt="User Image"
          className={`h-12 w-12 rounded-full border-orange-400 object-cover`}
        />
      </span>
      <span className="w-full flex-1 text-left">{props.user.fullName}</span>
      <span className="flex w-fit gap-4">
        <span className="opacity-50">{props.user.votes} votos</span>
        <span className="text-orange-400">
          {((props.user.votes / props.totalVotes) * 100).toFixed(2)}%
        </span>
      </span>
    </div>
  );
};
