"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function JuniorEntryControls({
  eventId,
  categoryAvailable,
  enabled,
}: {
  eventId: string;
  categoryAvailable: boolean;
  enabled: boolean;
}) {
  const router = useRouter();
  const [childName, setChildName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function createEntry(eventObject: React.FormEvent<HTMLFormElement>) {
    eventObject.preventDefault();
    if (pending || !enabled || !categoryAvailable) return;
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
          childName,
        }),
      });
      const result: { error?: string } = await response.json();
      if (!response.ok) {
        setError(result.error ?? "Não foi possível inscrever a criança.");
        return;
      }
      setChildName("");
      setMessage(
        "Cadastro criado. Adicione o título opcional e a foto no painel da criança.",
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
    <div className="grid gap-3">
      {!categoryAvailable ? (
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
          <button
            type="submit"
            disabled={pending || !categoryAvailable}
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
    </div>
  );
}
