"use client";

import Image from "next/image";
import { useRef, useState } from "react";

export default function ContestPhotoUpload({
  eventId,
  entryId,
  entryType,
  initialPhotoUrl,
  enabled,
}: {
  eventId: string;
  entryId: string;
  entryType: ContestantEntryType;
  initialPhotoUrl: string | null;
  enabled: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [photoUrl, setPhotoUrl] = useState(initialPhotoUrl);
  const [photo, setPhoto] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function uploadPhoto(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!photo || !consent || pending || !enabled) return;
    setPending(true);
    setError("");
    setMessage("");
    try {
      const body = new FormData();
      body.set("image", photo);
      body.set("photoConsent", "true");
      const response = await fetch(
        `/api/contestants/${entryId}/photo?eventId=${encodeURIComponent(eventId)}`,
        { method: "PUT", body },
      );
      const result: { photoUrl?: string; error?: string } =
        await response.json();
      if (!response.ok || !result.photoUrl) {
        setError(result.error ?? "Não foi possível enviar a foto.");
        return;
      }
      setPhotoUrl(result.photoUrl);
      setMessage("Foto salva com segurança.");
      setPhoto(null);
      setConsent(false);
      if (inputRef.current) inputRef.current.value = "";
    } catch {
      setError("Não foi possível conectar. Tente novamente.");
    } finally {
      setPending(false);
    }
  }

  const consentLabel =
    entryType === "junior"
      ? "Confirmo que sou responsável legal e autorizo o uso desta foto no concurso."
      : "Autorizo o uso desta foto no concurso.";

  return (
    <div className="grid gap-3 rounded-xl border border-white/10 bg-black/30 p-4">
      {photoUrl ? (
        <Image
          src={photoUrl}
          alt="Foto atual da inscrição"
          width={960}
          height={720}
          unoptimized
          className="max-h-72 w-full rounded-lg object-contain"
        />
      ) : (
        <p className="text-sm text-stone-300">
          Nenhuma foto foi enviada. A inscrição só poderá participar após estar
          completa e validada.
        </p>
      )}
      {enabled ? (
        <form onSubmit={uploadPhoto} className="grid gap-3">
          <label className="grid gap-1 text-sm">
            <span>{photoUrl ? "Substituir foto" : "Enviar foto"}</span>
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              required
              disabled={pending}
              onChange={(event) => setPhoto(event.target.files?.[0] ?? null)}
              className="block w-full text-sm text-stone-200 file:mr-3 file:rounded-lg file:border-0 file:bg-orange-400 file:px-3 file:py-2 file:font-semibold file:text-black"
            />
          </label>
          <p className="text-xs text-stone-400">JPG, PNG ou WebP, até 8 MB.</p>
          <label className="flex items-start gap-2 text-sm text-stone-200">
            <input
              type="checkbox"
              checked={consent}
              disabled={pending}
              onChange={(event) => setConsent(event.target.checked)}
              required
              className="mt-1 accent-orange-400"
            />
            <span>{consentLabel}</span>
          </label>
          <button
            type="submit"
            disabled={!photo || !consent || pending}
            className="w-fit rounded-lg bg-orange-400 px-4 py-2 font-semibold text-black disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending
              ? "Enviando..."
              : photoUrl
                ? "Salvar nova foto"
                : "Enviar foto"}
          </button>
        </form>
      ) : (
        <p role="status" className="text-sm text-stone-300">
          As fotos desta inscrição estão bloqueadas enquanto as inscrições do
          concurso estiverem fechadas.
        </p>
      )}
      {message ? <p role="status">{message}</p> : null}
      {error ? (
        <p role="alert" className="text-red-300">
          {error}
        </p>
      ) : null}
    </div>
  );
}
