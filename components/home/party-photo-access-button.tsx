"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function PartyPhotoAccessButton({
  eventId,
  eventStartsAt,
  initialNow,
}: {
  eventId: string;
  eventStartsAt: string;
  initialNow: string;
}) {
  const eventStartTime = new Date(eventStartsAt).getTime();
  const [available, setAvailable] = useState(
    () => new Date(initialNow).getTime() >= eventStartTime,
  );

  useEffect(() => {
    const updateAvailability = () => {
      setAvailable(Date.now() >= eventStartTime);
    };

    updateAvailability();
    const interval = window.setInterval(updateAvailability, 10_000);
    return () => window.clearInterval(interval);
  }, [eventStartTime]);

  if (!available) return null;

  return (
    <Link
      href={`/meu-halloween?eventId=${encodeURIComponent(eventId)}`}
      className="inline-flex min-h-12 items-center justify-center rounded-xl border border-orange-400 px-6 py-3 text-center text-lg font-semibold text-orange-300 transition hover:bg-orange-400/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-300 motion-reduce:transition-none"
    >
      Entrar para enviar fotos
    </Link>
  );
}
