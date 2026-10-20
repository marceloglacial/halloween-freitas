"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

export default function ContestantEntryEditor({
  eventId,
  entryId,
  entryType,
  initialDisplayName,
  initialTitle,
  initialPhotoUrl,
  enabled,
}: {
  eventId: string;
  entryId: string;
  entryType: ContestantEntryType;
  initialDisplayName: string;
  initialTitle?: string;
  initialPhotoUrl: string | null;
  enabled: boolean;
}) {
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [savedDisplayName, setSavedDisplayName] = useState(initialDisplayName);
  const [title, setTitle] = useState(initialTitle ?? "");
  const [savedTitle, setSavedTitle] = useState(initialTitle ?? "");
  const [photoUrl, setPhotoUrl] = useState(initialPhotoUrl);
  const [photo, setPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [consent, setConsent] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(
    () => () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    },
    [],
  );

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !enabled || (photo && !consent)) return;
    setPending(true);
    setError("");
    setMessage("");
    try {
      const groupNameChanged =
        entryType === "group" && displayName !== savedDisplayName;
      const titleChanged = entryType !== "group" && title !== savedTitle;
      if (groupNameChanged || titleChanged) {
        const response = await fetch(`/api/contestant-entries/${entryId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventId,
            ...(groupNameChanged ? { displayName } : {}),
            ...(titleChanged ? { costumeTitle: title } : {}),
          }),
        });
        const result: {
          displayName?: string;
          costumeTitle?: string | null;
          error?: string;
        } = await response.json();
        if (!response.ok)
          throw new Error(result.error ?? "Não foi possível salvar os dados.");
        if (groupNameChanged && result.displayName) {
          setDisplayName(result.displayName);
          setSavedDisplayName(result.displayName);
        }
        if (titleChanged) {
          const normalizedTitle = result.costumeTitle ?? "";
          setTitle(normalizedTitle);
          setSavedTitle(normalizedTitle);
        }
      }

      if (photo) {
        const body = new FormData();
        body.set("image", photo);
        body.set("photoConsent", "true");
        const response = await fetch(
          `/api/contestants/${entryId}/photo?eventId=${encodeURIComponent(eventId)}`,
          { method: "PUT", body },
        );
        const result: { photoUrl?: string; error?: string } =
          await response.json();
        if (!response.ok || !result.photoUrl)
          throw new Error(result.error ?? "Não foi possível enviar a foto.");
        setPhotoUrl(result.photoUrl);
        if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
        setPreviewUrl(null);
        setPhoto(null);
        setConsent(false);
        if (photoInputRef.current) photoInputRef.current.value = "";
      }
      setMessage("Dados salvos.");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Não foi possível conectar. Tente novamente.",
      );
    } finally {
      setPending(false);
    }
  }

  async function deletePhoto() {
    if (!photoUrl || pending || !enabled) return;
    setPending(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(
        `/api/contestants/${entryId}/photo?eventId=${encodeURIComponent(eventId)}`,
        { method: "DELETE" },
      );
      const result: {
        removed?: boolean;
        cleanupPending?: boolean;
        error?: string;
      } = await response.json();
      if (result.removed) {
        setPhotoUrl(null);
        if (result.cleanupPending) {
          setMessage("Foto removida da inscrição.");
          setError(
            result.error ?? "A exclusão no Cloudinary ainda está pendente.",
          );
        } else setMessage("Foto excluída.");
        return;
      }
      if (!response.ok)
        throw new Error(result.error ?? "Não foi possível excluir a foto.");
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Não foi possível conectar. Tente novamente.",
      );
    } finally {
      setPending(false);
    }
  }

  const changed =
    (entryType === "group" && displayName !== savedDisplayName) ||
    (entryType !== "group" && title !== savedTitle) ||
    photo !== null;
  const shownImage = previewUrl ?? photoUrl;
  const consentLabel =
    entryType === "junior"
      ? "Confirmo que sou responsável legal e autorizo o uso desta foto no concurso."
      : "Autorizo o uso desta foto no concurso.";

  return (
    <form onSubmit={save} className="grid gap-5">
      {entryType === "group" ? (
        <label
          htmlFor={`group-name-${entryId}`}
          className="grid gap-2 text-lg font-medium"
        >
          <span>Nome do grupo</span>
          <input
            id={`group-name-${entryId}`}
            type="text"
            minLength={2}
            maxLength={120}
            required
            value={displayName}
            disabled={!enabled || pending}
            onChange={(event) => {
              setDisplayName(event.target.value);
              setMessage("");
              setError("");
            }}
            className="w-full rounded-lg border border-white/20 bg-black px-3 py-3 text-base font-normal text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300 disabled:opacity-70"
          />
        </label>
      ) : (
        <label
          htmlFor={`costume-title-${entryId}`}
          className="grid gap-2 text-lg font-medium"
        >
          <span>Título da fantasia (opcional)</span>
          <input
            id={`costume-title-${entryId}`}
            type="text"
            maxLength={100}
            value={title}
            disabled={!enabled || pending}
            onChange={(event) => {
              setTitle(event.target.value);
              setMessage("");
              setError("");
            }}
            placeholder="Ex.: Pequena vampira"
            className="w-full rounded-lg border border-white/20 bg-black px-3 py-3 text-base font-normal text-white placeholder:text-stone-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300 disabled:opacity-70"
          />
        </label>
      )}

      <div className="grid gap-3">
        {!photoUrl && !previewUrl ? (
          <label
            htmlFor={`contest-photo-${entryId}`}
            className="grid gap-2 text-lg font-medium"
          >
            <span>Foto da fantasia</span>
            <input
              ref={photoInputRef}
              id={`contest-photo-${entryId}`}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={!enabled || pending}
              onChange={(event) => {
                const selectedPhoto = event.target.files?.[0] ?? null;
                if (previewUrlRef.current)
                  URL.revokeObjectURL(previewUrlRef.current);
                previewUrlRef.current = selectedPhoto
                  ? URL.createObjectURL(selectedPhoto)
                  : null;
                setPreviewUrl(previewUrlRef.current);
                setPhoto(selectedPhoto);
                setConsent(false);
                setMessage("");
                setError("");
              }}
              className="block w-full text-base text-stone-200 file:mr-3 file:rounded-lg file:border-0 file:bg-orange-400 file:px-3 file:py-2 file:font-semibold file:text-black"
            />
          </label>
        ) : null}
        <p className="text-sm text-stone-400">JPG, PNG ou WebP, até 8 MB.</p>
        {shownImage ? (
          <div className="grid gap-2">
            <p className="text-sm text-stone-300">
              {previewUrl ? "Prévia da foto selecionada" : "Foto salva"}
            </p>
            <Image
              src={shownImage}
              alt={
                previewUrl
                  ? "Prévia da foto selecionada"
                  : "Foto atual da fantasia"
              }
              width={960}
              height={720}
              unoptimized
              className="max-h-80 w-full rounded-lg object-contain"
            />
          </div>
        ) : (
          <p className="text-sm text-stone-300">Nenhuma foto foi enviada.</p>
        )}
        {photo ? (
          <>
            <label className="flex items-start gap-3 text-base text-stone-200">
              <input
                type="checkbox"
                checked={consent}
                disabled={pending}
                onChange={(event) => setConsent(event.target.checked)}
                className="mt-1 accent-orange-400"
              />
              <span>{consentLabel}</span>
            </label>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                if (previewUrlRef.current)
                  URL.revokeObjectURL(previewUrlRef.current);
                previewUrlRef.current = null;
                setPreviewUrl(null);
                setPhoto(null);
                setConsent(false);
                if (photoInputRef.current) photoInputRef.current.value = "";
              }}
              className="w-fit text-sm text-stone-300 underline disabled:opacity-50"
            >
              Cancelar foto selecionada
            </button>
          </>
        ) : null}
        {photoUrl && !photo ? (
          <button
            type="button"
            onClick={deletePhoto}
            disabled={!enabled || pending}
            className="w-fit text-sm text-red-300 underline disabled:opacity-50"
          >
            {pending ? "Excluindo…" : "Excluir foto"}
          </button>
        ) : null}
      </div>

      {enabled ? (
        <button
          type="submit"
          disabled={!changed || pending || Boolean(photo && !consent)}
          className="w-fit rounded-lg bg-orange-400 px-5 py-3 font-semibold text-black disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Salvando…" : "Salvar dados"}
        </button>
      ) : (
        <p role="status" className="text-sm text-stone-300">
          As inscrições do concurso estão fechadas.
        </p>
      )}
      {message ? (
        <p role="status" className="text-sm text-green-300">
          {message}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-red-300">
          {error}
        </p>
      ) : null}
    </form>
  );
}
