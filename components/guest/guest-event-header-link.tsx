import Link from "next/link";

export default function GuestEventHeaderLink({
  eventId,
  eventTitle,
}: {
  eventId: string;
  eventTitle: string;
}) {
  return (
    <Link
      href={`/meu-halloween?eventId=${encodeURIComponent(eventId)}`}
      aria-label={`${eventTitle} — voltar ao Meu Halloween`}
      className="inline-flex max-w-full items-center justify-center gap-3 justify-self-center rounded-lg text-center focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-300"
    >
      <span className="shrink-0 text-4xl" aria-hidden="true">
        🎃
      </span>
      <span className="text-lg break-words text-orange-300 sm:text-xl">
        {eventTitle}
      </span>
    </Link>
  );
}
