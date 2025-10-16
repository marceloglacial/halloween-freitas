import { secondaryFont } from "@/util/fonts";
import { FC, JSX } from "react";

const Card: FC<CardProps> = (props): JSX.Element => {
  return (
    <div
      data-card
      className="relative grid gap-4 rounded-2xl bg-stone-900 p-8 text-center"
    >
      <div data-card-icon className="w-full text-8xl">
        {props.icon}
      </div>
      <div data-card-header className={`${secondaryFont.className} text-4xl`}>
        {props.title}
      </div>
      <div data-card-body className="lg:text-xl">
        {props.description}
      </div>
    </div>
  );
};
export default Card;
