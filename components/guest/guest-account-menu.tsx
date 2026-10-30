"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import LogoutButton from "@/components/logout-button";

export default function GuestAccountMenu({ guestName }: { guestName: string }) {
  const [open, setOpen] = useState(false);
  const { isLoaded, user } = useUser();
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const initial = guestName.trim().charAt(0).toLocaleUpperCase("pt-BR") || "C";
  const isAdmin = isLoaded && user?.publicMetadata?.role === "admin";

  useEffect(() => {
    if (!open) return;

    function closeOnOutsideClick(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !accountMenuRef.current?.contains(event.target)
      ) {
        setOpen(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        menuButtonRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div ref={accountMenuRef} className="relative shrink-0">
      <button
        ref={menuButtonRef}
        type="button"
        aria-expanded={open}
        aria-controls="guest-account-menu"
        aria-label={`Abrir menu da conta de ${guestName}`}
        onClick={() => setOpen((isOpen) => !isOpen)}
        className="flex min-h-11 items-center gap-2 rounded-full border border-orange-400/40 bg-white/5 py-1 pr-3 pl-1 text-sm font-semibold text-white transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300 motion-reduce:transition-none"
      >
        <span
          aria-hidden="true"
          className="grid size-8 shrink-0 place-items-center rounded-full bg-orange-500/20 text-orange-200"
        >
          {initial}
        </span>
        <span className="max-w-28 truncate sm:max-w-40">{guestName}</span>
        <svg
          aria-hidden="true"
          className={`size-4 transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.22 7.47a.75.75 0 0 1 1.06 0L10 11.19l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 8.53a.75.75 0 0 1 0-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      <div
        id="guest-account-menu"
        hidden={!open}
        className="absolute top-full right-0 z-40 mt-2 grid w-56 gap-2 rounded-xl border border-white/15 bg-zinc-950 p-2 shadow-xl [&[hidden]]:hidden"
      >
        {isAdmin ? (
          <Link
            href="/dashboard"
            onClick={() => setOpen(false)}
            className="flex min-h-11 items-center rounded-xl px-4 py-2 font-semibold text-orange-200 transition hover:bg-white/5 hover:text-orange-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300 motion-reduce:transition-none"
          >
            Administração
          </Link>
        ) : null}
        <Link
          href="/"
          onClick={() => setOpen(false)}
          className="flex min-h-11 items-center rounded-xl px-4 py-2 font-semibold text-orange-200 transition hover:bg-white/5 hover:text-orange-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300 motion-reduce:transition-none"
        >
          Voltar para o site
        </Link>
        <LogoutButton
          onClick={() => setOpen(false)}
          className="min-h-11 w-full rounded-xl border border-red-400/30 bg-red-950/60 px-4 py-2 text-left font-semibold text-red-100 transition hover:border-red-300/50 hover:bg-red-900/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-300 motion-reduce:transition-none"
        />
      </div>
    </div>
  );
}
