"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type GroupEntry = {
  _id: string;
};

export default function GroupEntryControls({
  eventId,
  categories,
  entry,
  enabled,
}: {
  eventId: string;
  categories: Category[];
  entry: GroupEntry | null;
  enabled: boolean;
}) {
  const router = useRouter();
  const [categoryId, setCategoryId] = useState(categories[0]?._id ?? "");
  const [groupName, setGroupName] = useState("");
  const [costumeTitle, setCostumeTitle] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function createEntry(eventObject: React.FormEvent<HTMLFormElement>) {
    eventObject.preventDefault();
    if (pending || !enabled || entry || !categoryId) return;
    setPending(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/contestant-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          entryType: "group",
          categoryId,
          groupName,
          costumeTitle,
        }),
      });
      const result: { error?: string } = await response.json();
      if (!response.ok) {
        setError(result.error ?? "Não foi possível inscrever o grupo.");
        return;
      }
      setGroupName("");
      setCostumeTitle("");
      setMessage(
        "Rascunho criado. Envie uma foto para concluir a inscrição do grupo.",
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
      aria-labelledby="group-entry-heading"
      className="grid gap-3 rounded-2xl border border-white/10 bg-zinc-900 p-5"
    >
      <div>
        <h3 id="group-entry-heading" className="text-xl font-semibold">
          Fantasia em grupo
        </h3>
        <p className="mt-1 text-sm text-stone-300">
          O criador pode inscrever um grupo por edição. Não é necessário
          cadastrar integrantes; você poderá votar na sua própria inscrição.
        </p>
      </div>
      {entry ? (
        <p role="status" className="text-sm text-stone-300">
          Você já tem uma inscrição de grupo nesta edição.
        </p>
      ) : categories.length === 0 ? (
        <p role="status" className="text-sm text-stone-300">
          Não há uma categoria de grupo disponível nesta edição.
        </p>
      ) : (
        <form onSubmit={createEntry} className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm sm:col-span-2">
            <span>Nome do grupo</span>
            <input
              type="text"
              minLength={2}
              maxLength={120}
              required
              value={groupName}
              disabled={pending}
              onChange={(eventObject) => setGroupName(eventObject.target.value)}
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
            <span>Fantasia do grupo (opcional)</span>
            <input
              type="text"
              maxLength={100}
              value={costumeTitle}
              disabled={pending}
              onChange={(eventObject) =>
                setCostumeTitle(eventObject.target.value)
              }
              placeholder="Ex.: Família Addams"
              className="rounded-lg border border-white/20 bg-black px-3 py-2 text-white placeholder:text-stone-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300"
            />
          </label>
          <button
            type="submit"
            disabled={pending || !categoryId}
            className="w-fit rounded-lg bg-orange-400 px-4 py-2 font-semibold text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "Salvando…" : "Criar inscrição de grupo"}
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
