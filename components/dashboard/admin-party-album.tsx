"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";

type AdminPartyPhoto = {
  photoId: string;
  previewUrl: string;
  uploadedAt: string;
  bytes: number;
  width: number;
  height: number;
  format: string;
};

type AlbumData = {
  published: boolean;
  publishedAt: string | null;
  updatedAt: string | null;
  photos: AdminPartyPhoto[];
};

async function responseMessage(response: Response) {
  const body = (await response.json().catch(() => null)) as {
    error?: string;
  } | null;
  return body?.error ?? "Não foi possível concluir a operação.";
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatSize(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AdminPartyAlbum({ eventId }: { eventId: string }) {
  const [album, setAlbum] = useState<AlbumData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const fetchAlbum = useCallback(
    async (signal?: AbortSignal) => {
      const response = await fetch(
        `/api/admin/events/${eventId}/party-photos`,
        {
          cache: "no-store",
          signal,
        },
      );
      if (!response.ok) throw new Error(await responseMessage(response));
      return (await response.json()) as AlbumData;
    },
    [eventId],
  );

  useEffect(() => {
    const controller = new AbortController();
    void fetchAlbum(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setAlbum(data);
          setLoading(false);
        }
      })
      .catch((cause: unknown) => {
        if (cause instanceof Error && cause.name === "AbortError") return;
        if (!controller.signal.aborted) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Não foi possível carregar o álbum.",
          );
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [fetchAlbum]);

  async function loadAlbum() {
    try {
      setAlbum(await fetchAlbum());
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível carregar o álbum.",
      );
    } finally {
      setLoading(false);
    }
  }

  function refreshAlbum() {
    setLoading(true);
    setError(null);
    void loadAlbum();
  }

  async function setPublication() {
    if (!album) return;
    const published = !album.published;
    const prompt = published
      ? "Publicar o álbum? Todas as fotos desta edição ficarão visíveis ao público, inclusive novos envios."
      : "Ocultar o álbum? As fotos deixarão de aparecer nas páginas e APIs públicas.";
    if (!window.confirm(prompt)) return;

    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(
        `/api/admin/events/${eventId}/party-photos`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ published }),
        },
      );
      if (!response.ok) throw new Error(await responseMessage(response));
      setNotice(published ? "Álbum publicado." : "Álbum ocultado.");
      await loadAlbum();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível atualizar o álbum.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function removePhoto(photo: AdminPartyPhoto) {
    if (
      !window.confirm(
        "Remover esta foto do álbum? Ela desaparecerá imediatamente e a exclusão do arquivo será repetida se o Cloudinary estiver indisponível.",
      )
    ) {
      return;
    }

    setRemovingId(photo.photoId);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(
        `/api/admin/events/${eventId}/party-photos/${photo.photoId}`,
        { method: "DELETE" },
      );
      if (!response.ok) throw new Error(await responseMessage(response));
      setAlbum((current) =>
        current
          ? {
              ...current,
              photos: current.photos.filter(
                (item) => item.photoId !== photo.photoId,
              ),
            }
          : current,
      );
      setNotice("Foto removida do álbum.");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível remover a foto.",
      );
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <section
      aria-labelledby="party-album-heading"
      className="space-y-5 rounded-xl bg-white/10 p-4 md:p-6"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <h1 id="party-album-heading" className="text-2xl font-bold">
            Álbum de fotos da festa
          </h1>
          <p className="max-w-2xl text-sm text-gray-300">
            Os envios ficam privados até a publicação. Publicar mostra todas as
            fotos mantidas nesta edição e também os próximos envios.
          </p>
          {album && (
            <p role="status" className="text-sm">
              Álbum {album.published ? "publicado" : "privado"}
              {album.published && album.publishedAt
                ? ` desde ${formatDate(album.publishedAt)}`
                : ""}
              {` · ${album.photos.length} ${album.photos.length === 1 ? "foto" : "fotos"}`}
            </p>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={refreshAlbum}
            disabled={loading || busy || removingId !== null}
            className="rounded-lg border border-white/25 px-4 py-2 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300 disabled:opacity-50"
          >
            Atualizar
          </button>
          {album && (
            <button
              type="button"
              onClick={() => void setPublication()}
              disabled={loading || busy || removingId !== null}
              className="rounded-lg bg-orange-500 px-4 py-2 font-semibold text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300 disabled:opacity-50"
            >
              {busy
                ? "Salvando…"
                : album.published
                  ? "Ocultar álbum"
                  : "Publicar álbum"}
            </button>
          )}
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-red-950/70 p-3 text-sm">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="rounded-lg bg-green-950/70 p-3 text-sm">
          {notice}
        </p>
      )}
      {loading ? (
        <p role="status" className="text-sm text-gray-300">
          Carregando fotos…
        </p>
      ) : error && !album ? null : album?.photos.length ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {album.photos.map((photo) => (
            <li
              key={photo.photoId}
              className="overflow-hidden rounded-xl border border-white/15 bg-black/30"
            >
              <div className="relative aspect-square">
                <Image
                  src={photo.previewUrl}
                  alt={`Foto enviada em ${formatDate(photo.uploadedAt)}`}
                  fill
                  unoptimized
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  className="object-cover"
                />
              </div>
              <div className="space-y-2 p-3">
                <p className="text-xs text-gray-300">
                  {formatDate(photo.uploadedAt)} · {photo.width} ×{" "}
                  {photo.height}
                  {` · ${formatSize(photo.bytes)}`}
                </p>
                <button
                  type="button"
                  onClick={() => void removePhoto(photo)}
                  disabled={busy || removingId !== null}
                  className="w-full rounded-lg border border-red-300/50 px-3 py-2 text-sm font-semibold text-red-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-300 disabled:opacity-50"
                >
                  {removingId === photo.photoId ? "Removendo…" : "Remover foto"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-lg border border-dashed border-white/20 p-6 text-center text-sm text-gray-300">
          Ainda não há fotos nesta edição.
        </p>
      )}
    </section>
  );
}
