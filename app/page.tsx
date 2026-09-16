import Hero from "@/components/home/hero";
import EventInfo from "@/components/home/event-info";
import Schedule from "@/components/home/schedule";
import Footer from "@/components/footer";
import SignUp from "@/components/home/signup";
import { PastEvent } from "@/components/home/post-event";
import {
  getCurrentEvent,
  getEventPhase,
  getRegistrationState,
} from "@/lib/events";

export const dynamic = "force-dynamic";

export default async function Home() {
  const event = await getCurrentEvent();
  const now = new Date();
  const initialNow = now.toISOString();
  const phase = event ? getEventPhase(event, now) : "archived";
  const isPast = phase === "results" || phase === "archived";

  return (
    <>
      <main>
        <Hero
          startsAt={event?.startsAt}
          showCountdown={!isPast}
          initialNow={initialNow}
        />
        {isPast ? (
          <PastEvent />
        ) : (
          <>
            <EventInfo event={event} />
            <Schedule />
            {event && (
              <SignUp
                event={event}
                registrationState={getRegistrationState(event, now)}
              />
            )}
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
