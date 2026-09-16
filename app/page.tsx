import Hero from "@/components/home/hero";
import EventInfo from "@/components/home/event-info";
import Schedule from "@/components/home/schedule";
import Footer from "@/components/footer";
import SignUp from "@/components/home/signup";
import { PastEvent } from "@/components/home/post-event";
import { getCurrentEvent, getEventPhase } from "@/lib/events";

export const dynamic = "force-dynamic";

export default async function Home() {
  const event = await getCurrentEvent();
  const phase = event ? getEventPhase(event) : "archived";
  const isPast = phase === "results" || phase === "archived";

  return (
    <>
      <main>
        <Hero startsAt={event?.startsAt} showCountdown={!isPast} />
        {isPast ? (
          <PastEvent />
        ) : (
          <>
            <EventInfo event={event} />
            <Schedule />
            {phase === "registration" && <SignUp />}
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
