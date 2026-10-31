"use client";

import Link from "next/link";
import { useGesture } from "@use-gesture/react";
import { useCallback, useEffect, useRef, useState } from "react";
import BackButton from "@/components/back-button";
import type { PublicContestGalleryEntry } from "@/lib/contestant-gallery";

type GalleryEvent = { _id: string; slug: string; title: string };

function Photo({
  entry,
  eventSlug,
  large = false,
}: {
  entry: PublicContestGalleryEntry;
  eventSlug: string;
  large?: boolean;
}) {
  const src = `/api/contest-gallery/${entry._id}/photo?event=${encodeURIComponent(eventSlug)}`;
  return (
    // Use the no-store application proxy directly so the optimizer cannot retain
    // a copy after an entry is withdrawn or its consented photo is removed.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      width={entry.width}
      height={entry.height}
      loading={large ? "eager" : "lazy"}
      decoding="async"
      alt={`Fantasia de ${entry.displayName}`}
      className={
        large
          ? "h-auto max-h-[76vh] w-auto max-w-[78vw] object-contain"
          : "h-full w-full object-cover"
      }
    />
  );
}

function ContestPhotoDialog({
  entries,
  initialIndex,
  eventSlug,
  onClose,
}: {
  entries: PublicContestGalleryEntry[];
  initialIndex: number;
  eventSlug: string;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(initialIndex);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const activeEntry = entries[index];
  const previous = useCallback(
    () => setIndex((value) => (value + entries.length - 1) % entries.length),
    [entries.length],
  );
  const next = useCallback(
    () => setIndex((value) => (value + 1) % entries.length),
    [entries.length],
  );
  const gesture = useGesture(
    {
      onDrag: ({ swipe: [swipeX] }) => {
        if (swipeX === -1) next();
        if (swipeX === 1) previous();
      },
    },
    { enabled: entries.length > 1 },
  );

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft" && entries.length > 1) previous();
      if (event.key === "ArrowRight" && entries.length > 1) next();
      if (event.key === "Tab") {
        const controls = dialogRef.current?.querySelectorAll<HTMLElement>(
          "button:not([disabled])",
        );
        if (!controls?.length) return;
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [entries.length, next, onClose, previous]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        {...gesture()}
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Foto de ${activeEntry.displayName}`}
        className="relative flex max-h-[92vh] max-w-[92vw] flex-col items-center gap-3 rounded-xl bg-zinc-900 p-4 text-white"
      >
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 z-10 rounded-full bg-orange-400 px-3 py-2 font-semibold text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          aria-label="Fechar galeria"
        >
          Fechar
        </button>
        <Photo entry={activeEntry} eventSlug={eventSlug} large />
        <p className="text-center text-lg font-semibold">
          {activeEntry.displayName}
          <span className="block text-sm font-normal text-stone-300">
            {activeEntry.categoryIcon ? `${activeEntry.categoryIcon} ` : ""}
            {activeEntry.categoryTitle}
          </span>
        </p>
        {entries.length > 1 ? (
          <div className="flex gap-4">
            <button
              type="button"
              onClick={previous}
              className="rounded-lg bg-white/10 px-4 py-2 focus-visible:outline-2 focus-visible:outline-orange-300"
              aria-label="Foto anterior"
            >
              ← Anterior
            </button>
            <span
              aria-live="polite"
              className="self-center text-sm text-stone-300"
            >
              {index + 1} de {entries.length}
            </span>
            <button
              type="button"
              onClick={next}
              className="rounded-lg bg-white/10 px-4 py-2 focus-visible:outline-2 focus-visible:outline-orange-300"
              aria-label="Próxima foto"
            >
              Próxima →
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function FotosPage({
  entries,
  events,
  selectedEvent,
  photoEventSlug,
}: {
  entries: PublicContestGalleryEntry[];
  events: GalleryEvent[];
  selectedEvent?: GalleryEvent;
  photoEventSlug: string;
}) {
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const filteredEntries = entries.filter((entry) =>
    `${entry.displayName} ${entry.categoryTitle}`
      .toLocaleLowerCase("pt-BR")
      .includes(search.trim().toLocaleLowerCase("pt-BR")),
  );
  const closeDialog = useCallback(() => setSelectedIndex(null), []);

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-8 text-white sm:px-8 lg:py-12">
      <BackButton href="/" />
      <header className="flex flex-col items-center gap-8 pt-12 pb-8 text-center">
        <p className="text-5xl" aria-hidden="true">
          🎃
        </p>
        <h1 className="text-5xl lg:text-7xl">Galeria de Fotos</h1>
        {selectedEvent ? (
          <p className="text-orange-300">{selectedEvent.title}</p>
        ) : null}
        {events.length > 1 ? (
          <nav
            aria-label="Edições"
            className="flex flex-wrap justify-center gap-3"
          >
            {events.map((event) => (
              <Link
                key={event._id}
                href={`/fotos?event=${encodeURIComponent(event.slug)}`}
                aria-current={
                  event._id === selectedEvent?._id ? "page" : undefined
                }
                className={`rounded-lg px-4 py-2 ${event._id === selectedEvent?._id ? "bg-orange-500 text-black" : "bg-white/10"}`}
              >
                {event.title}
              </Link>
            ))}
          </nav>
        ) : null}
        <label className="w-full max-w-xl text-left">
          <span className="sr-only">Buscar fotos por nome ou categoria</span>
          <input
            ref={searchRef}
            type="search"
            aria-label="Buscar fotos por nome ou categoria"
            placeholder="Buscar por nome ou categoria..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full rounded-xl border border-orange-400 bg-zinc-900 px-4 py-3 text-white placeholder:text-stone-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300"
          />
        </label>
      </header>

      {!entries.length ? (
        <p className="py-16 text-center text-stone-300" role="status">
          Ainda não há fotos de fantasias disponíveis nesta edição.
        </p>
      ) : !filteredEntries.length ? (
        <p className="py-16 text-center text-stone-300" role="status">
          Nenhuma foto corresponde à busca.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
          {filteredEntries.map((entry, index) => (
            <li key={entry._id}>
              <button
                type="button"
                onClick={() => setSelectedIndex(index)}
                aria-label={`Abrir foto de ${entry.displayName}, ${entry.categoryTitle}`}
                className="group w-full overflow-hidden rounded-xl bg-zinc-900 text-left shadow-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-300"
              >
                <div className="aspect-[3/4] overflow-hidden">
                  <Photo entry={entry} eventSlug={photoEventSlug} />
                </div>
                <span className="block min-h-16 p-3">
                  <span className="block font-semibold group-hover:text-orange-300">
                    {entry.displayName}
                  </span>
                  <span className="text-sm text-stone-300">
                    {entry.categoryIcon ? `${entry.categoryIcon} ` : ""}
                    {entry.categoryTitle}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {selectedIndex !== null ? (
        <ContestPhotoDialog
          entries={filteredEntries}
          initialIndex={selectedIndex}
          eventSlug={photoEventSlug}
          onClose={closeDialog}
        />
      ) : null}
    </main>
  );
}
