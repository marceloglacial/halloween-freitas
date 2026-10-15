import { secondaryFont } from "@/util/fonts";
import { FC, JSX } from "react";
import Link from "next/link";
import Countdown from "@/components/countdown";
import BackgroundVideo from "@/components/background-video";

interface HeroProps {
  startsAt?: string;
  showCountdown: boolean;
  showRsvpCta: boolean;
  initialNow: string;
}

const Hero: FC<HeroProps> = ({
  startsAt,
  showCountdown,
  showRsvpCta,
  initialNow,
}): JSX.Element => {
  return (
    <div id="inicio" className="scroll-mt-24 relative flex items-center justify-center lg:min-h-screen 2xl:min-h-[900px]">
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

          {showCountdown && startsAt && (
            <Countdown targetDate={startsAt} initialNow={initialNow} />
          )}
          {showRsvpCta && (
            <Link
              href="#confirmacao"
              className="min-h-12 rounded-xl bg-orange-500 px-8 py-3 text-lg font-bold text-black shadow-[0_0_24px_rgba(249,115,22,0.45)] transition hover:bg-orange-400 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-300 lg:text-xl"
            >
              Confirme sua presença
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};
export default Hero;
