import Hero from "@/components/home/hero";
import EventInfo from "@/components/home/event-info";
import Schedule from "@/components/home/schedule";
import Footer from "@/components/footer";
import SignUp from "@/components/home/signup";
import { PastEvent } from "@/components/home/post-event";
import EventLifecycle from "@/components/home/event-lifecycle";
import { getCurrentEvent, getRegistrationState } from "@/lib/events";
import { getHomeEventState } from "@/util/home-event-state";

export const dynamic = "force-dynamic";

export default async function Home() {
  const event = await getCurrentEvent();
  const now = new Date();
  const initialNow = now.toISOString();
  const initialHomeState = getHomeEventState(event, now);

  return (
    <>
      <main>
        <Hero
          startsAt={event?.startsAt}
          showCountdown={initialHomeState === "pre_event"}
          initialNow={initialNow}
        />
        <EventLifecycle
          initialEvent={event}
          initialNow={initialNow}
          postEventContent={<PastEvent />}
          preEventContent={
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
          }
        />
      </main>
      <Footer />
    </>
  );
}
