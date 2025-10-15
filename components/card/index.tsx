import { secondaryFont } from "@/util/fonts";
import { FC, JSX } from "react";

const Card: FC<CardProps> = (props): JSX.Element => {
  return (
    <div
      data-card
      className="rounded-2xl bg-stone-900 p-8 grid gap-4 relative text-center"
    >
      <div data-card-icon className="text-8xl w-full">
        {props.icon}
      </div>
      <div data-card-header className={`${secondaryFont.className} text-4xl `}>
        {props.title}
      </div>
      <div data-card-body className="text-xl">
        {props.description}
      </div>
    </div>
  );
};
export default Card;
