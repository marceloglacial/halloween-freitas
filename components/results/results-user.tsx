"use client";

import { CldImage } from "next-cloudinary";
import { FC, JSX } from "react";

interface ResultsUserProps {
  user: UserWithVotes;
  totalVotes: number;
  showImage: boolean;
}
export const ResultsUser: FC<ResultsUserProps> = (props): JSX.Element => (
  <div className="flex flex-col items-center justify-center gap-2">
    {props.showImage && (
      <CldImage
        src={props.user.imageUrl || "halloween-freitas/apple-icon_fqkaye"}
        width={900}
        height={600}
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        alt="User Image"
        className={`h-40 w-40 rounded-full ${props.user.imageUrl && "border-8"} border-orange-400 object-cover`}
      />
    )}
    <div>
      {((props.user.votes / props.totalVotes) * 100).toFixed(2)}% -{" "}
      {props.user.fullName} - {props.user.votes} voto(s)
    </div>
  </div>
);
