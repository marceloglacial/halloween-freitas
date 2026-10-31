import Link from "next/link";
import GuestAccountMenu from "@/components/guest/guest-account-menu";

export default function GuestHeader({
  eventId,
  eventYear,
  guestName,
}: {
  eventId: string;
  eventYear: number;
  guestName: string;
}) {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-zinc-950/95 px-4 py-4 backdrop-blur sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3">
        <Link
          href={`/meu-halloween?eventId=${encodeURIComponent(eventId)}`}
          aria-label={`Halloween dos Freitas ${eventYear} — início do portal`}
          className="flex min-w-0 items-center gap-2 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300"
        >
          <span aria-hidden="true" className="shrink-0 text-2xl">
            🎃
          </span>
          <span className="truncate font-semibold text-orange-300 sm:text-lg">
            Halloween dos Freitas {eventYear}
          </span>
        </Link>
        <GuestAccountMenu guestName={guestName} />
      </div>
    </header>
  );
}
