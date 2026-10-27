import GuestBottomNavigation from "@/components/guest/guest-bottom-navigation";
import GuestHeader from "@/components/guest/guest-header";
import type { ReactNode } from "react";

export default function GuestFlowShell({
  eventId,
  eventYear,
  guestName,
  votingOpen,
  contestEntryClosed,
  title,
  description,
  children,
}: {
  eventId: string;
  eventYear: number;
  guestName: string;
  votingOpen: boolean;
  contestEntryClosed: boolean;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-black text-white">
      <GuestHeader
        eventId={eventId}
        eventYear={eventYear}
        guestName={guestName}
      />
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-8 px-4 pt-12 pb-24 text-white sm:px-8 lg:py-16">
        <header className="grid gap-3 text-left">
          <h1 className="text-4xl font-semibold lg:text-6xl">{title}</h1>
          {description ? <p className="text-stone-300">{description}</p> : null}
        </header>

        {children}

      </main>
      <GuestBottomNavigation
        eventId={eventId}
        votingOpen={votingOpen}
        contestEntryClosed={contestEntryClosed}
      />
    </div>
  );
}
