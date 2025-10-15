import { pad } from "@/util/countdown";
import { secondaryFont } from "@/util/fonts";

const TimerBlock: React.FC<TimerBlockProps> = ({ value, label }) => (
  <div className="timer w-16">
    <div className="bg-black/50 py-4 px-2 rounded-lg overflow-hidden">
      <h3
        className={`${secondaryFont.className} text-5xl text-white text-center`}
      >
        {pad(value)}
      </h3>
    </div>
    <p className="text-lg  text-white mt-1 text-center w-full">{label}</p>
  </div>
);

export default TimerBlock;
