"use client";

import { CldImage } from "next-cloudinary";
import { FC, JSX, useState } from "react";

interface ResultsUserProps {
  user: UserWithVotes;
  totalVotes: number;
  showImage: boolean;
  position: number;
}
export const ResultsUser: FC<ResultsUserProps> = (props): JSX.Element => {
  const [showWinner, setShowWinner] = useState<boolean>(false);

  if (props.position === 1) {
    return (
      <div
        className={`flex flex-col items-center gap-4 ${showWinner ? "" : "animate-pulse blur-2xl"}`}
        onClick={() => setShowWinner(true)}
      >
        <CldImage
          src={props.user.imageUrl || "halloween-freitas/apple-icon_fqkaye"}
          width={900}
          height={600}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          alt="User Image"
          className={`h-56 w-56 rounded-full border-8 border-orange-400 object-cover`}
        />
        <div className="grid gap-4">
          <span className="text-6xl font-bold">{props.user.fullName}</span>
          <span className="mx-auto flex gap-4 text-2xl">
            <span className="opacity-50">{props.user.votes} votos</span>
            <span className="text-orange-400">
              {((props.user.votes / props.totalVotes) * 100).toFixed(2)}%
            </span>
          </span>
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
