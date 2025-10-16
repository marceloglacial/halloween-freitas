import Hero from "@/components/home/hero";
import EventInfo from "@/components/home/event-info";
import Schedule from "@/components/home/schedule";
import Footer from "@/components/footer";
import SignUp from "@/components/home/signup";

export default function Home() {
  return (
    <>
      <main>
        <Hero />
        <EventInfo />
        <Schedule />
        <SignUp />
      </main>
      <Footer />
    </>
  );
}
