import { pad } from "@/util/countdown";
import { secondaryFont } from "@/util/fonts";
import { FC, JSX } from "react";

const TimerBlock: FC<TimerBlockProps> = ({ value, label }): JSX.Element => (
  <div className="timer w-16">
    <div className="overflow-hidden rounded-lg bg-black/50 px-2 py-4">
      <h3
        className={`${secondaryFont.className} text-center text-5xl text-white`}
      >
        {pad(value)}
      </h3>
    </div>
    <p className="mt-1 w-full text-center text-lg text-white">{label}</p>
  </div>
);

export default TimerBlock;
