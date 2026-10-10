"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type IndividualEntry = {
  _id: string;
  costumeTitle?: string;
  status: ContestantEntryStatus;
};

export default function IndividualEntryControls({
  eventId,
  categories,
  entry,
  enabled,
}: {
  eventId: string;
  categories: Category[];
  entry: IndividualEntry | null;
  enabled: boolean;
}) {
  const router = useRouter();
  const [categoryId, setCategoryId] = useState(categories[0]?._id ?? "");
  const [costumeTitle, setCostumeTitle] = useState(entry?.costumeTitle ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const canEdit =
    enabled &&
    (!entry || (entry.status !== "locked" && entry.status !== "withdrawn"));

  async function save(eventObject: React.FormEvent<HTMLFormElement>) {
    eventObject.preventDefault();
    if (pending || !canEdit) return;
    setPending(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(
        entry
          ? `/api/contestant-entries/${entry._id}`
          : "/api/contestant-entries",
        {
          method: entry ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventId,
            costumeTitle,
            ...(entry ? {} : { categoryId }),
          }),
        },
      );
      const result: { error?: string } = await response.json();
      if (!response.ok) {
        setError(result.error ?? "Não foi possível salvar a inscrição.");
        return;
      }
      setMessage(
        entry
          ? "Título salvo."
          : "Inscrição criada como rascunho. Envie uma foto e autorize o uso para participar.",
      );
      router.refresh();
    } catch {
      setError("Não foi possível conectar. Tente novamente.");
    } finally {
      setPending(false);
    }
  }

  if (!entry && !enabled) return null;

  return (
    <section
      aria-labelledby="individual-entry-heading"
      className="grid gap-3 rounded-2xl border border-white/10 bg-zinc-900 p-5"
    >
      <div>
        <h3 id="individual-entry-heading" className="text-xl font-semibold">
          Fantasia individual
        </h3>
        {entry ? (
          <p className="mt-1 text-sm text-stone-300">
            {entry.costumeTitle
              ? `Título: ${entry.costumeTitle}`
              : "Título opcional não informado."}
          </p>
        ) : (
          <p className="mt-1 text-sm text-stone-300">
            A inscrição usa seu nome confirmado neste evento e não altera sua
            presença. Depois, envie uma foto com autorização.
          </p>
        )}
      </div>
      {canEdit && entry === null && categories.length === 0 ? (
        <p role="status" className="text-sm text-stone-300">
          Não há uma categoria individual disponível nesta edição.
        </p>
      ) : canEdit ? (
        <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
          {entry === null ? (
            <label className="grid gap-1 text-sm sm:col-span-2">
              <span>Categoria</span>
              <select
                required
                value={categoryId}
                disabled={pending}
                onChange={(eventObject) =>
                  setCategoryId(eventObject.target.value)
                }
                className="rounded-lg border border-white/20 bg-black px-3 py-2 text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300"
              >
                {categories.map((category) => (
                  <option key={category._id} value={category._id}>
                    {category.icon ? `${category.icon} ` : ""}
                    {category.title}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="grid gap-1 text-sm sm:col-span-2">
            <span>Título da fantasia (opcional)</span>
            <input
              type="text"
              maxLength={100}
              value={costumeTitle}
              disabled={pending}
              onChange={(eventObject) =>
                setCostumeTitle(eventObject.target.value)
              }
              placeholder="Ex.: Bruxa das abóboras"
              className="rounded-lg border border-white/20 bg-black px-3 py-2 text-white placeholder:text-stone-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300"
            />
          </label>
          <button
            type="submit"
            disabled={pending || (!entry && !categoryId)}
            className="w-fit rounded-lg bg-orange-400 px-4 py-2 font-semibold text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending
              ? "Salvando…"
              : entry
                ? "Salvar título"
                : "Criar inscrição individual"}
          </button>
        </form>
      ) : (
        <p role="status" className="text-sm text-stone-300">
          Esta inscrição não pode mais ser alterada.
        </p>
      )}
      {message ? <p role="status">{message}</p> : null}
      {error ? (
        <p role="alert" className="text-red-300">
          {error}
        </p>
      ) : null}
    </section>
  );
}
