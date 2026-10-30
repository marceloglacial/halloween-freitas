"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PublicPartyGalleryPhoto } from "@/lib/party-photo-writes";

type PartyGalleryContext = {
  slug: string;
  title?: string;
  year?: number;
};

type GalleryResponse = {
  published: boolean;
  photos: PublicPartyGalleryPhoto[];
};

const REFRESH_INTERVAL_MS = 60_000;

function PartyPhotoViewer({
  photos,
  photoId,
  onClose,
  onSelect,
}: {
  photos: PublicPartyGalleryPhoto[];
  photoId: string;
  onClose: () => void;
  onSelect: (id: string) => void;
}) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const photosRef = useRef(photos);
  const index = photos.findIndex((photo) => photo.photoId === photoId);
  const photo = photos[index];

  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  useEffect(() => {
    if (!photoId) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
      const currentPhotos = photosRef.current;
      const currentIndex = currentPhotos.findIndex(
        (item) => item.photoId === photoId,
      );
      if (event.key === "ArrowLeft" && currentPhotos.length > 1) {
        event.preventDefault();
        onSelect(
          currentPhotos[
            (currentIndex - 1 + currentPhotos.length) % currentPhotos.length
          ].photoId,
        );
      }
      if (event.key === "ArrowRight" && currentPhotos.length > 1) {
        event.preventDefault();
        onSelect(
          currentPhotos[(currentIndex + 1) % currentPhotos.length].photoId,
        );
      }
      if (event.key === "Tab") {
        const buttons = viewerRef.current?.querySelectorAll<HTMLElement>(
          "button:not([disabled])",
        );
        if (!buttons?.length) {
          event.preventDefault();
          return;
        }
        const first = buttons[0];
        const last = buttons[buttons.length - 1];
        if (!viewerRef.current?.contains(document.activeElement)) {
          event.preventDefault();
          (event.shiftKey ? last : first).focus();
        } else if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [onClose, onSelect, photoId]);

  if (!photo) return null;

  const previous = photos[(index - 1 + photos.length) % photos.length];
  const next = photos[(index + 1) % photos.length];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Foto ${index + 1} de ${photos.length} do álbum da festa`}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={viewerRef}
        className="relative flex max-h-full max-w-6xl flex-col items-center gap-4"
      >
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          className="absolute -top-1 right-0 z-10 rounded-full bg-orange-500 px-4 py-2 font-semibold text-black focus-visible:outline-2 focus-visible:outline-white sm:top-0 sm:-right-14"
          aria-label="Fechar foto ampliada"
        >
          Fechar
        </button>
        <Image
          src={photo.previewUrl}
          width={photo.width}
          height={photo.height}
          unoptimized
          alt={`Foto ${index + 1} do álbum da festa`}
          className="max-h-[78vh] w-auto max-w-[88vw] rounded-xl object-contain"
        />
        <p className="text-sm text-white/80">
          {index + 1} de {photos.length}
        </p>
        {photos.length > 1 && (
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => onSelect(previous.photoId)}
              className="rounded-lg bg-white/10 px-5 py-3 text-white hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-orange-300"
              aria-label="Foto anterior"
            >
              Anterior
            </button>
            <button
              type="button"
              onClick={() => onSelect(next.photoId)}
              className="rounded-lg bg-white/10 px-5 py-3 text-white hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-orange-300"
              aria-label="Próxima foto"
            >
              Próxima
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function PartyGallery({
  event,
  published: initialPublished,
  initialPhotos,
}: {
  event: PartyGalleryContext | null;
  published: boolean;
  initialPhotos: PublicPartyGalleryPhoto[];
}) {
  const [published, setPublished] = useState(initialPublished);
  const [photos, setPhotos] = useState(initialPublished ? initialPhotos : []);
  const [refreshFailed, setRefreshFailed] = useState(false);
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const closeViewer = useCallback(() => setSelectedPhotoId(null), []);
  const eventSlug = event?.slug ?? "";

  useEffect(() => {
    if (!eventSlug) return;
    let active = true;

    async function refreshGallery() {
      try {
        const response = await fetch(
          `/api/party-gallery?event=${encodeURIComponent(eventSlug)}`,
          { cache: "no-store" },
        );
        if (!response.ok) throw new Error("Gallery refresh failed");
        const data = (await response.json()) as GalleryResponse;
        if (!active) return;
        setPublished(data.published);
        setPhotos(data.published ? data.photos : []);
        setRefreshFailed(false);
        if (!data.published) setSelectedPhotoId(null);
      } catch {
        if (active) setRefreshFailed(true);
      }
    }

    void refreshGallery();
    const interval = window.setInterval(() => {
      if (!document.hidden) void refreshGallery();
    }, REFRESH_INTERVAL_MS);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [eventSlug]);

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-8 sm:px-8 sm:py-12">
      <Link
        href="/"
        className="rounded-lg text-orange-300 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-orange-300"
      >
        Voltar ao início
      </Link>
      <header className="mx-auto flex max-w-4xl flex-col items-center gap-5 py-12 text-center">
        <span className="text-7xl" aria-hidden="true">
          📸
        </span>
        <h1 className="text-5xl text-orange-200 sm:text-7xl">Álbum da festa</h1>
        {published && event && (
          <Link
            href={`/meu-halloween/fotos-da-festa?event=${encodeURIComponent(event.slug)}`}
            className="rounded-lg bg-orange-500 px-5 py-3 font-semibold text-black transition hover:bg-orange-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300"
          >
            Adicionar mais fotos
          </Link>
        )}
      </header>

      {!event ? (
        <p className="mx-auto max-w-xl rounded-2xl border border-white/10 bg-stone-900 p-8 text-center text-lg text-white/80">
          Nenhuma edição está disponível no momento.
        </p>
      ) : !published ? (
        <p
          role="status"
          className="mx-auto max-w-xl rounded-2xl border border-orange-400/40 bg-stone-900 p-8 text-center text-lg text-orange-100"
        >
          Este álbum aguarda a liberação do anfitrião.
        </p>
      ) : photos.length === 0 ? (
        <p className="mx-auto max-w-xl rounded-2xl border border-white/10 bg-stone-900 p-8 text-center text-lg text-white/80">
          Ainda não há fotos publicadas nesta edição.
        </p>
      ) : (
        <>
          {refreshFailed && (
            <p role="status" className="mb-5 text-center text-orange-200">
              Não foi possível atualizar o álbum. Tentaremos novamente.
            </p>
          )}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 xl:grid-cols-5">
            {photos.map((photo, index) => (
              <button
                key={photo.photoId}
                type="button"
                onClick={() => setSelectedPhotoId(photo.photoId)}
                aria-label={`Ampliar foto ${index + 1} do álbum da festa`}
                className="group overflow-hidden rounded-xl border border-white/10 bg-stone-900 shadow-lg transition hover:border-orange-400 focus-visible:outline-2 focus-visible:outline-orange-300"
              >
                <Image
                  src={photo.previewUrl}
                  width={photo.width}
                  height={photo.height}
                  unoptimized
                  loading="lazy"
                  alt={`Foto ${index + 1} do álbum da festa`}
                  className="aspect-square w-full object-cover transition group-hover:scale-105"
                />
              </button>
            ))}
          </div>
        </>
      )}

      {published &&
        selectedPhotoId &&
        photos.some((photo) => photo.photoId === selectedPhotoId) && (
          <PartyPhotoViewer
            photos={photos}
            photoId={selectedPhotoId}
            onClose={closeViewer}
            onSelect={setSelectedPhotoId}
          />
        )}
    </main>
  );
}
