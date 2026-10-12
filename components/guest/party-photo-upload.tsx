"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

type GuestPartyPhoto = {
  photoId: string;
  previewUrl: string;
  uploadedAt: string;
  width: number;
  height: number;
  format: "jpg" | "png" | "webp";
};

type SelectedPhoto = { id: string; file: File; previewUrl: string };

function uploadPhoto(
  eventId: string,
  file: File,
  onProgress: (value: number) => void,
) {
  return new Promise<GuestPartyPhoto>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open(
      "POST",
      `/api/party-photos?eventId=${encodeURIComponent(eventId)}`,
    );
    request.responseType = "json";
    request.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    });
    request.addEventListener("load", () => {
      const response = request.response as {
        photo?: GuestPartyPhoto;
        error?: string;
      } | null;
      if (request.status < 200 || request.status >= 300 || !response?.photo) {
        reject(new Error(response?.error ?? "Não foi possível enviar a foto."));
        return;
      }
      resolve(response.photo);
    });
    request.addEventListener("error", () =>
      reject(new Error("Não foi possível conectar. Tente novamente.")),
    );
    const body = new FormData();
    body.set("image", file);
    request.send(body);
  });
}

export default function PartyPhotoUpload({
  eventId,
  available,
}: {
  eventId: string;
  available: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrls = useRef<string[]>([]);
  const [selected, setSelected] = useState<SelectedPhoto[]>([]);
  const [photos, setPhotos] = useState<GuestPartyPhoto[]>([]);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(available);
  const [errors, setErrors] = useState<string[]>([]);
  const [message, setMessage] = useState("");

  useEffect(
    () => () => previewUrls.current.forEach((url) => URL.revokeObjectURL(url)),
    [],
  );

  useEffect(() => {
    if (!available) {
      setLoading(false);
      return;
    }
    let active = true;
    async function loadPhotos() {
      try {
        const response = await fetch(
          `/api/party-photos?eventId=${encodeURIComponent(eventId)}`,
          { cache: "no-store" },
        );
        const result: { photos?: GuestPartyPhoto[]; error?: string } =
          await response.json();
        if (!response.ok) throw new Error(result.error);
        if (active) setPhotos(result.photos ?? []);
      } catch {
        if (active)
          setErrors(["Não foi possível carregar suas fotos enviadas."]);
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadPhotos();
    return () => {
      active = false;
    };
  }, [available, eventId]);

  function choosePhotos(files: FileList | null) {
    previewUrls.current.forEach((url) => URL.revokeObjectURL(url));
    const fileList = Array.from(files ?? []);
    const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
    const validFiles = fileList.filter(
      (file) =>
        allowedTypes.has(file.type) &&
        file.size > 0 &&
        file.size <= 8 * 1024 * 1024,
    );
    setErrors(
      fileList
        .filter((file) => !validFiles.includes(file))
        .map((file) =>
          file.size > 8 * 1024 * 1024
            ? `${file.name}: a foto deve ter até 8 MB.`
            : `${file.name}: envie uma foto JPG, PNG ou WebP válida.`,
        ),
    );
    const next = validFiles.map((file) => ({
      id: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    previewUrls.current = next.map(({ previewUrl }) => previewUrl);
    setSelected(next);
    setProgress({});
    setMessage("");
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !available || selected.length === 0) return;
    setPending(true);
    setErrors([]);
    setMessage("");
    const failed: SelectedPhoto[] = [];
    let uploadedCount = 0;
    for (const photo of selected) {
      try {
        const uploaded = await uploadPhoto(eventId, photo.file, (value) =>
          setProgress((current) => ({ ...current, [photo.id]: value })),
        );
        setPhotos((current) => [uploaded, ...current]);
        uploadedCount += 1;
      } catch (error) {
        failed.push(photo);
        setErrors((current) => [
          ...current,
          `${photo.file.name}: ${error instanceof Error ? error.message : "Não foi possível enviar a foto."}`,
        ]);
      }
    }
    const failedIds = new Set(failed.map(({ id }) => id));
    previewUrls.current = selected.flatMap(({ id, previewUrl }) => {
      if (failedIds.has(id)) return [previewUrl];
      URL.revokeObjectURL(previewUrl);
      return [];
    });
    setSelected(failed);
    if (inputRef.current) inputRef.current.value = "";
    setMessage(
      uploadedCount
        ? `${uploadedCount} ${uploadedCount === 1 ? "foto enviada" : "fotos enviadas"} com segurança.`
        : "Confira os erros e tente novamente.",
    );
    setPending(false);
  }

  return (
    <section
      aria-labelledby="party-photos-heading"
      className="grid gap-4 rounded-2xl border border-white/10 bg-zinc-900 p-5 sm:p-6"
    >
      <div className="grid gap-2">
        <h2 id="party-photos-heading" className="text-3xl font-semibold">
          Fotos da festa
        </h2>
        <p className="text-stone-300">
          Envie várias fotos da festa. Elas ficam privadas e só serão mostradas
          a todos se a organização publicar o álbum.
        </p>
      </div>
      {!available ? (
        <p role="status" className="rounded-xl bg-black/30 p-4 text-stone-300">
          O envio abre quando a festa começar.
        </p>
      ) : (
        <>
          <form onSubmit={submit} className="grid gap-3">
            <label className="grid gap-1 text-sm">
              <span>Escolha uma ou mais fotos</span>
              <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                disabled={pending}
                onChange={(event) => choosePhotos(event.target.files)}
                className="block w-full text-sm text-stone-200 file:mr-3 file:rounded-lg file:border-0 file:bg-orange-400 file:px-3 file:py-2 file:font-semibold file:text-black"
              />
            </label>
            <p className="text-xs text-stone-400">
              JPG, PNG ou WebP, até 8 MB por foto.
            </p>
            {selected.length ? (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {selected.map((photo) => (
                  <li key={photo.id} className="grid gap-2">
                    <Image
                      src={photo.previewUrl}
                      alt={`Prévia: ${photo.file.name}`}
                      width={480}
                      height={360}
                      unoptimized
                      className="h-32 w-full rounded-lg object-cover"
                    />
                    <span className="truncate text-xs text-stone-300">
                      {photo.file.name}
                    </span>
                    {pending ? (
                      <progress
                        aria-label={`Envio de ${photo.file.name}`}
                        max={100}
                        value={progress[photo.id] ?? 0}
                        className="w-full accent-orange-400"
                      />
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
            <button
              type="submit"
              disabled={!selected.length || pending}
              className="w-fit rounded-lg bg-orange-400 px-4 py-2 font-semibold text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? "Enviando fotos…" : "Enviar fotos"}
            </button>
          </form>
          {message ? <p role="status">{message}</p> : null}
          {errors.map((error, index) => (
            <p
              key={`${index}-${error}`}
              role="alert"
              className="text-sm text-red-300"
            >
              {error}
            </p>
          ))}
          <div className="grid gap-3">
            <h3 className="text-xl font-semibold">Minhas fotos enviadas</h3>
            {loading ? (
              <p role="status" className="text-sm text-stone-300">
                Carregando suas fotos…
              </p>
            ) : photos.length ? (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {photos.map((photo) => (
                  <li key={photo.photoId}>
                    <Image
                      src={photo.previewUrl}
                      alt="Foto enviada para o álbum da festa"
                      width={photo.width}
                      height={photo.height}
                      unoptimized
                      className="h-36 w-full rounded-lg object-cover"
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-stone-400">
                Você ainda não enviou fotos para esta edição.
              </p>
            )}
          </div>
        </>
      )}
    </section>
  );
}
