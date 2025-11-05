import Hero from "@/components/home/hero";
import EventInfo from "@/components/home/event-info";
import Schedule from "@/components/home/schedule";
import Footer from "@/components/footer";
import SignUp from "@/components/home/signup";
import { IS_PAST } from "@/constants/globals";
import { PastEvent } from "@/components/home/post-event";

export default function Home() {
  return (
    <>
      <main>
        <Hero />
        {IS_PAST ? (
          <PastEvent />
        ) : (
          <>
            <EventInfo />
            <Schedule />
            <SignUp />
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
