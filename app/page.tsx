import Hero from "@/components/home/hero";
import EventInfo from "@/components/home/event-info";
import Schedule from "@/components/home/schedule";
import Footer from "@/components/footer";
import SignUp from "@/components/home/signup";
import { PastEvent } from "@/components/home/post-event";
import EventLifecycle from "@/components/home/event-lifecycle";
import { getActiveEvent, getRegistrationState } from "@/lib/events";
import { getCategories } from "@/util/get-categories";
import { getHomeEventState } from "@/util/home-event-state";
import { getContestEntryState } from "@/util/contest-entry-state";

export const dynamic = "force-dynamic";

export default async function Home() {
  const event = await getActiveEvent();
  const categories = event ? await getCategories(event._id) : [];
  const now = new Date();
  const initialNow = now.toISOString();
  const initialHomeState = getHomeEventState(event, now);

  return (
    <main>
      <EventLifecycle
        initialEvent={event}
        initialCategories={categories}
        initialNow={initialNow}
        initialRsvpOpen={Boolean(
          event && getRegistrationState(event, now) === "open",
        )}
        initialContestEntryState={
          event ? getContestEntryState(event, now) : "closed"
        }
        heroContent={
          <Hero
            startsAt={event?.eventStartsAt}
            eventId={event?._id}
            showCountdown={initialHomeState === "pre_event"}
            showRsvpCta={Boolean(
              event && getRegistrationState(event, now) === "open",
            )}
            initialNow={initialNow}
            contestEntryClosed={Boolean(
              event?.status === "active" &&
                event.contestEntryStatus === "closed" &&
                event.votingStatus === "not_started",
            )}
            showPartyPhotoCta={
              event !== null && getContestEntryState(event, now) === "open"
            }
            votingEnded={
              event?.status === "active" &&
              event.votingStatus === "ended" &&
              !event.resultsPublished
            }
          />
        }
        footerContent={<Footer />}
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
  );
}
