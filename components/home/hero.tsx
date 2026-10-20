import { secondaryFont } from "@/util/fonts";
import { FC, JSX } from "react";
import Link from "next/link";
import Countdown from "@/components/countdown";
import BackgroundVideo from "@/components/background-video";
import PartyPhotoAccessButton from "@/components/home/party-photo-access-button";

interface HeroProps {
  startsAt?: string;
  eventId?: string;
  showCountdown: boolean;
  showRsvpCta: boolean;
  initialNow: string;
  contestEntryClosed?: boolean;
  showPartyPhotoCta?: boolean;
  votingEnded?: boolean;
}

const Hero: FC<HeroProps> = ({
  startsAt,
  eventId,
  showCountdown,
  showRsvpCta,
  initialNow,
  contestEntryClosed = false,
  showPartyPhotoCta = true,
  votingEnded = false,
}): JSX.Element => {
  return (
    <div
      id="inicio"
      className="relative flex scroll-mt-24 items-center justify-center lg:min-h-[80vh] 2xl:min-h-[760px]"
    >
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

          {contestEntryClosed || votingEnded ? (
            <p
              role="status"
              className="max-w-2xl text-xl text-orange-300 lg:text-2xl"
            >
              {contestEntryClosed
                ? "As inscrições para o concurso de fantasias foram encerradas. Votação em breve!"
                : "A votação foi encerrada. Os resultados serão publicados em breve."}
            </p>
          ) : null}
          {!contestEntryClosed && !votingEnded && showCountdown && startsAt && (
            <Countdown targetDate={startsAt} initialNow={initialNow} />
          )}
          {!contestEntryClosed &&
          !votingEnded &&
          (showRsvpCta || (showPartyPhotoCta && eventId && startsAt)) ? (
            <div className="flex flex-wrap items-center justify-center gap-4">
              {showRsvpCta && (
                <Link
                  href="#confirmacao"
                  className="min-h-12 rounded-xl bg-orange-500 px-8 py-3 text-lg font-bold text-black shadow-[0_0_24px_rgba(249,115,22,0.45)] transition hover:bg-orange-400 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-300 lg:text-xl"
                >
                  Confirme sua presença
                </Link>
              )}
              {showPartyPhotoCta && eventId && startsAt ? (
                <PartyPhotoAccessButton
                  eventId={eventId}
                  eventStartsAt={startsAt}
                  initialNow={initialNow}
                />
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
export default Hero;
