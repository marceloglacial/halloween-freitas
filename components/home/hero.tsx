import { secondaryFont } from "@/util/fonts";
import { FC, JSX } from "react";
import Countdown from "@/components/countdown";
import BackgroundVideo from "@/components/background-video";

const Hero: FC = (): JSX.Element => {
  return (
    <div className="relative flex items-center justify-center lg:min-h-screen 2xl:min-h-[900px]">
      <BackgroundVideo />
      <div className="hero-content text-neutral-content relative text-center">
        <div className="flex max-w-2xl flex-col items-center gap-16 py-12 lg:gap-4 lg:p-0">
          <h1
            className={`text-7xl font-bold lg:text-9xl ${secondaryFont.className}`}
          >
            🎃 <br />
            Halloween{" "}
            <span className="lg:hidden">
              <br />
            </span>{" "}
            dos Freitas
          </h1>
          <Countdown />
        </div>
      </div>
    </div>
  );
};
export default Hero;
