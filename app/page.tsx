import Hero from "@/components/hero";
import Image from "next/image";

export default function Home() {
  return (
    <div>
      <main>
        <Hero />
      </main>
      <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center">
        Footer
      </footer>
    </div>
  );
}
