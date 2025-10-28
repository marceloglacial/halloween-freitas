"use client";
import { useState } from "react";
import UserCard from "../user-card";
import { toast } from "sonner";
import Link from "next/link";

interface VoteGridProps {
  user: User;
  users: User[];
  categoryId: string;
}

export default function VoteGrid({ user, users, categoryId }: VoteGridProps) {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [voted, setVoted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVote = async () => {
    if (!selectedUserId) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/votes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voterId: user._id,
          voteForId: selectedUserId,
          categoryId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao votar");
      setVoted(true);
      toast.success("Voto registrado com sucesso!");
    } catch (err: unknown) {
      const errors = err as Error;
      toast.error(errors.message);
      setError(errors.message);
      console.debug(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <div className="mx-auto grid max-w-3xl grid-cols-2 gap-8 lg:grid-cols-4">
        {users.map((user) => (
          <div
            key={user._id}
            onClick={() =>
              voted
                ? toast.error("Você já votou!")
                : setSelectedUserId(user._id)
            }
            className={voted ? "opacity-50" : ""}
          >
            <UserCard user={user} selected={selectedUserId === user._id} />
          </div>
        ))}
      </div>
      {selectedUserId && !voted && (
        <button
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-orange-400 px-8 py-4 text-2xl text-white shadow-lg"
          onClick={handleVote}
          disabled={loading}
        >
          {loading ? "Votando..." : "Votar"}
        </button>
      )}
      {voted && (
        <Link
          href={"/votacao/categories"}
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-purple-600 px-8 py-2 text-white shadow-lg lg:py-4 lg:text-2xl"
        >
          Voltar para votação
        </Link>
      )}
    </div>
  );
}
