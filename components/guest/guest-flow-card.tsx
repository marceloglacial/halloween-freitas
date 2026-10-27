"use client";

import Link from "next/link";
import { toast } from "sonner";

export type GuestCardStatusTone = "available" | "in_progress" | "unavailable";

const statusClasses: Record<GuestCardStatusTone, string> = {
  available: "bg-green-400/15 text-green-200",
  in_progress: "bg-orange-400/15 text-orange-200",
  unavailable: "bg-gray-700 text-gray-200",
};

export default function GuestFlowCard({
  href,
  icon,
  title,
  description,
  status,
  inactiveReason,
}: {
  href: string;
  icon: string;
  title: string;
  description: string;
  status: { label: string; tone: GuestCardStatusTone };
  inactiveReason?: string;
}) {
  const cardClassName = `grid h-full min-h-40 w-full gap-3 rounded-2xl border p-5 text-left transition focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-300 ${
    inactiveReason
      ? "cursor-not-allowed border-white/5 bg-stone-950/70 opacity-70"
      : "border-white/10 bg-stone-900 hover:border-orange-300/60 hover:bg-zinc-800"
  }`;

  const content = (
    <>
      <span className="flex flex-wrap items-center justify-between gap-2">
        <span className="shrink-0 text-3xl" aria-hidden="true">
          {icon}
        </span>
        <span
          className={`inline-flex max-w-full rounded-full px-3 py-1 text-xs leading-4 font-semibold ${statusClasses[status.tone]}`}
        >
          {status.label}
        </span>
      </span>
      <span className="text-xl font-semibold">{title}</span>
      <span className="text-sm text-stone-300">{description}</span>
    </>
  );

  if (inactiveReason) {
    return (
      <button
        type="button"
        aria-disabled="true"
        onClick={() => toast.warning(inactiveReason)}
        className={cardClassName}
      >
        {content}
      </button>
    );
  }

  return (
    <Link href={href} className={cardClassName}>
      {content}
    </Link>
  );
}
