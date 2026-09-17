"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import UserCard from "../user-card";
import { toast } from "sonner";

export default function VoteGrid({ users, categoryId }: VoteGridProps) {
  const router = useRouter();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [voted, setVoted] = useState(false);
  const [search, setSearch] = useState("");

  const handleVote = async () => {
    if (!selectedUserId) return;

    setLoading(true);
    try {
      const res = await fetch("/api/votes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voteForId: selectedUserId,
          categoryId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao votar");
      setVoted(true);
      toast.success("Voto registrado!", {
        dismissible: false,
        duration: Infinity,
        action: {
          label: "Voltar",
          onClick: () => {
            router.push("/votacao/categories");
          },
        },
      });
    } catch (err: unknown) {
      const errors = err as Error;
      toast.error(errors.message, {
        cancel: {
          label: "Fechar",
          onClick: () => close(),
        },
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter((u) =>
    u.fullName.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="relative">
      <div className="sticky top-4 z-40 mb-12 flex justify-center">
        <input
          type="text"
          aria-label="Buscar candidato por nome"
          value={search}
          onChange={(e) => {
            setSelectedUserId(null);
            setSearch(e.target.value);
          }}
          placeholder="Buscar por nome..."
          className="w-full max-w-xs rounded-2xl border border-orange-400 bg-black px-4 py-2 text-lg shadow"
        />
      </div>
      {filteredUsers.length === 0 && (
        <div className="w-full text-center">Nenhum resultado.</div>
      )}
      <div className="mx-auto grid max-w-3xl grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-4">
        {filteredUsers.map((user) => (
          <button
            type="button"
            key={user._id}
            onClick={() =>
              voted
                ? toast.error("Você já votou!")
                : setSelectedUserId(user._id)
            }
            className={`text-left ${voted ? "opacity-50" : ""}`}
            disabled={voted}
            aria-pressed={selectedUserId === user._id}
          >
            <UserCard user={user} selected={selectedUserId === user._id} />
          </button>
        ))}
      </div>
      {selectedUserId && !voted && (
        <button
          className="fixed bottom-6 left-1/2 z-50 w-full max-w-xs -translate-x-1/2 rounded-2xl bg-orange-400 px-16 py-3 text-white shadow-lg lg:py-4 lg:text-xl"
          onClick={handleVote}
          disabled={loading}
        >
          {loading ? "Votando..." : "Votar"}
        </button>
      )}
    </div>
  );
}
