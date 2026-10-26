"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export default function IndividualEntryControls({
  eventId,
  enabled,
}: {
  eventId: string;
  enabled: boolean;
}) {
  const router = useRouter();
  const photoInputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);
  const [title, setTitle] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  useEffect(
    () => () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    },
    [],
  );

  async function save(eventObject: React.FormEvent<HTMLFormElement>) {
    eventObject.preventDefault();
    if (pending || !enabled || !photo || !consent) return;
    setPending(true);
    setError("");
    try {
      const body = new FormData();
      body.set("image", photo);
      body.set("photoConsent", "true");
      if (title.trim()) body.set("costumeTitle", title);
      const response = await fetch(
        `/api/contestant-entries/individual/photo?eventId=${encodeURIComponent(eventId)}`,
        { method: "POST", body },
      );
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(
          result.error ?? "Não foi possível salvar sua participação.",
        );
      }
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
      setPreviewUrl(null);
      setPhoto(null);
      setConsent(false);
      if (photoInputRef.current) photoInputRef.current.value = "";
      router.refresh();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Não foi possível conectar. Tente novamente.",
      );
    } finally {
      setPending(false);
    }
  }

  if (!enabled) return null;

  return (
    <form
      onSubmit={save}
      className="grid gap-5 rounded-2xl border border-white/10 bg-stone-900 p-5"
    >
      <div>
        <h2 className="text-xl font-semibold">Fantasia individual</h2>
        <p className="mt-1 text-sm text-stone-300">
          Seu RSVP já permite participar. A candidatura será criada quando você
          salvar uma foto válida.
        </p>
      </div>
      <label className="grid gap-2 text-lg font-medium">
        <span>Título da fantasia (opcional)</span>
        <input
          type="text"
          maxLength={100}
          value={title}
          disabled={pending}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Ex.: Pequena vampira"
          className="rounded-lg border border-white/20 bg-black px-3 py-3 text-base font-normal text-white placeholder:text-stone-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300 disabled:opacity-70"
        />
      </label>
      <label className="grid gap-2 text-lg font-medium">
        <span>Foto da fantasia</span>
        <input
          ref={photoInputRef}
          type="file"
          required
          accept="image/jpeg,image/png,image/webp"
          disabled={pending}
          onChange={(event) => {
            const selected = event.target.files?.[0] ?? null;
            if (previewUrlRef.current) {
              URL.revokeObjectURL(previewUrlRef.current);
            }
            previewUrlRef.current = selected
              ? URL.createObjectURL(selected)
              : null;
            setPreviewUrl(previewUrlRef.current);
            setPhoto(selected);
            setConsent(false);
            setError("");
          }}
          className="block w-full text-base text-stone-200 file:mr-3 file:rounded-lg file:border-0 file:bg-orange-400 file:px-3 file:py-2 file:font-semibold file:text-black"
        />
      </label>
      <p className="text-sm text-stone-400">JPG, PNG ou WebP, até 8 MB.</p>
      {previewUrl ? (
        <div className="grid gap-2">
          <p className="text-sm text-stone-300">Prévia da foto selecionada</p>
          <Image
            src={previewUrl}
            alt="Prévia da foto selecionada"
            width={960}
            height={720}
            unoptimized
            className="max-h-80 w-full rounded-lg object-contain"
          />
        </div>
      ) : null}
      {photo ? (
        <label className="flex items-start gap-3 text-base text-stone-200">
          <input
            type="checkbox"
            checked={consent}
            disabled={pending}
            onChange={(event) => setConsent(event.target.checked)}
            className="mt-1 accent-orange-400"
          />
          <span>Autorizo o uso desta foto no concurso.</span>
        </label>
      ) : null}
      <button
        type="submit"
        disabled={pending || !photo || !consent}
        className="w-fit rounded-lg bg-orange-400 px-5 py-3 font-semibold text-black disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Salvando…" : "Salvar participação"}
      </button>
      {error ? (
        <p role="alert" className="text-sm text-red-300">
          {error}
        </p>
      ) : null}
    </form>
  );
}
