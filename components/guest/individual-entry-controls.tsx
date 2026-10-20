"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function IndividualEntryControls({
  eventId,
  enabled,
}: {
  eventId: string;
  enabled: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function save(eventObject: React.FormEvent<HTMLFormElement>) {
    eventObject.preventDefault();
    if (pending || !enabled) return;
    setPending(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(
        "/api/contestant-entries",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventId }),
        },
      );
      const result: { error?: string } = await response.json();
      if (!response.ok) {
        setError(result.error ?? "Não foi possível salvar a inscrição.");
        return;
      }
      setMessage("Inscrição criada. Complete o título e envie uma foto no painel da fantasia.");
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
      <p className="text-sm text-stone-300">
        Crie seu cadastro. Depois, edite o título e envie a foto diretamente no
        painel da fantasia.
      </p>
      <form onSubmit={save}>
        <button
          type="submit"
          disabled={pending}
          className="w-fit rounded-lg bg-orange-400 px-4 py-2 font-semibold text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Criando…" : "Criar inscrição individual"}
        </button>
      </form>
      {message ? <p role="status">{message}</p> : null}
      {error ? (
        <p role="alert" className="text-red-300">
          {error}
        </p>
      ) : null}
    </div>
  );
}
