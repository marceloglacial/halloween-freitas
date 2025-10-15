import { secondaryFont } from "@/util/fonts";
import { FC, JSX } from "react";

const Hero: FC = (): JSX.Element => {
  return (
    <div className="flex items-center justify-center lg:min-h-screen 2xl:min-h-[900px] relative overflow-hidden">
      <video
        autoPlay
        playsInline
        loop
        muted
        className="fixed top-0 left-0 w-auto min-w-full min-h-full max-w-none"
        src="/hero-video.mp4"
      />
      <div className="hero-content text-center text-neutral-content relative z-30">
        <div className="max-w-2xl flex flex-col items-center gap-4 py-12 lg:p-0">
          <h1
            className={`text-7xl lg:text-9xl font-bold ${secondaryFont.className}`}
          >
            🎃 <br />
            Halloween dos Freitas
          </h1>
        </div>
      </div>
    </div>
  );
};
export default Hero;
