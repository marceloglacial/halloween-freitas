import { secondaryFont } from "@/util/fonts";
import { FC, JSX } from "react";
import Countdown from "@/components/countdown";

const Hero: FC = (): JSX.Element => {
  return (
    <div className="relative flex items-center justify-center overflow-hidden lg:min-h-screen 2xl:min-h-[900px]">
      <video
        autoPlay
        playsInline
        loop
        muted
        className="fixed top-0 left-0 min-h-full w-auto max-w-none min-w-full"
        src="/hero-video.mp4"
      />
      <div className="hero-content text-neutral-content relative text-center">
        <div className="flex max-w-2xl flex-col items-center gap-4 py-12 lg:p-0">
          <h1
            className={`text-7xl font-bold lg:text-9xl ${secondaryFont.className}`}
          >
            🎃 <br />
            Halloween dos Freitas
          </h1>
          <Countdown />
        </div>
      </div>
    </div>
  );
};
export default Hero;
