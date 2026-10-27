"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

type GroupEntry = {
  _id: string;
};

export default function GroupEntryControls({
  eventId,
  categoryAvailable,
  entry,
  enabled,
}: {
  eventId: string;
  categoryAvailable: boolean;
  entry: GroupEntry | null;
  enabled: boolean;
}) {
  const router = useRouter();
  const [groupName, setGroupName] = useState("");
  const [pending, setPending] = useState(false);

  async function createEntry(eventObject: React.FormEvent<HTMLFormElement>) {
    eventObject.preventDefault();
    if (pending || !enabled || entry || !categoryAvailable) return;
    setPending(true);
    try {
      const response = await fetch("/api/contestant-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          entryType: "group",
          groupName,
        }),
      });
      const result: { error?: string } = await response.json();
      if (!response.ok) {
        toast.error(result.error ?? "Não foi possível inscrever o grupo.");
        return;
      }
      setGroupName("");
      toast.success(
        "Inscrição criada. Envie a foto no painel para concluir o cadastro.",
      );
      router.refresh();
    } catch {
      toast.error("Não foi possível conectar. Tente novamente.");
    } finally {
      setPending(false);
    }
  }

  if (!enabled || entry) return null;

  return (
    <div className="grid gap-3">
      {!categoryAvailable ? (
        <p role="status" className="text-sm text-stone-300">
          Não há uma categoria de grupo disponível nesta edição.
        </p>
      ) : (
        <form onSubmit={createEntry} className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm sm:col-span-2">
            <span>Nome da fantasia</span>
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
          <button
            type="submit"
            disabled={pending || !categoryAvailable}
            className="w-fit rounded-lg bg-orange-400 px-4 py-2 font-semibold text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "Salvando…" : "Criar inscrição de grupo"}
          </button>
        </form>
      )}
    </div>
  );
}
