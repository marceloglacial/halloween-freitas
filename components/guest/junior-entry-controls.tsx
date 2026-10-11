"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function JuniorEntryControls({
  eventId,
  categories,
  enabled,
}: {
  eventId: string;
  categories: Category[];
  enabled: boolean;
}) {
  const router = useRouter();
  const [categoryId, setCategoryId] = useState(categories[0]?._id ?? "");
  const [childName, setChildName] = useState("");
  const [costumeTitle, setCostumeTitle] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function createEntry(eventObject: React.FormEvent<HTMLFormElement>) {
    eventObject.preventDefault();
    if (pending || !enabled || !categoryId) return;
    setPending(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/contestant-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          entryType: "junior",
          categoryId,
          childName,
          costumeTitle,
        }),
      });
      const result: { error?: string } = await response.json();
      if (!response.ok) {
        setError(result.error ?? "Não foi possível inscrever a criança.");
        return;
      }
      setChildName("");
      setCostumeTitle("");
      setMessage(
        "Rascunho criado. Envie uma foto e confirme sua autorização para concluir a inscrição.",
      );
      router.refresh();
    } catch {
      setError("Não foi possível conectar. Tente novamente.");
    } finally {
      setPending(false);
    }
  }

  if (!enabled) return null;

  return (
    <section
      aria-labelledby="junior-entry-heading"
      className="grid gap-3 rounded-2xl border border-white/10 bg-zinc-900 p-5"
    >
      <div>
        <h3 id="junior-entry-heading" className="text-xl font-semibold">
          Fantasia infantil
        </h3>
        <p className="mt-1 text-sm text-stone-300">
          Inscreva cada criança separadamente. O rascunho fica privado até você
          enviar uma foto e confirmar sua autorização.
        </p>
      </div>
      {categories.length === 0 ? (
        <p role="status" className="text-sm text-stone-300">
          Não há uma categoria infantil disponível nesta edição.
        </p>
      ) : (
        <form onSubmit={createEntry} className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm sm:col-span-2">
            <span>Nome da criança</span>
            <input
              type="text"
              autoComplete="off"
              minLength={2}
              maxLength={120}
              required
              value={childName}
              disabled={pending}
              onChange={(eventObject) => setChildName(eventObject.target.value)}
              className="rounded-lg border border-white/20 bg-black px-3 py-2 text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300"
            />
          </label>
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
          <label className="grid gap-1 text-sm sm:col-span-2">
            <span>Fantasia (opcional)</span>
            <input
              type="text"
              maxLength={100}
              value={costumeTitle}
              disabled={pending}
              onChange={(eventObject) =>
                setCostumeTitle(eventObject.target.value)
              }
              placeholder="Ex.: Pequena vampira"
              className="rounded-lg border border-white/20 bg-black px-3 py-2 text-white placeholder:text-stone-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300"
            />
          </label>
          <button
            type="submit"
            disabled={pending || !categoryId}
            className="w-fit rounded-lg bg-orange-400 px-4 py-2 font-semibold text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "Salvando…" : "Adicionar criança ao concurso"}
          </button>
        </form>
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
