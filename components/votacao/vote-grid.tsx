"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import UserCard from "../user-card";
import { toast } from "sonner";

export default function VoteGrid({
  users,
  categoryId,
  roundId,
  eventId,
}: VoteGridProps) {
  const router = useRouter();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (reviewing || submitted) stepHeadingRef.current?.focus();
  }, [reviewing, submitted]);

  const handleVote = async () => {
    if (!selectedUserId || loading) return;

    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/votes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateId: selectedUserId,
          categoryId,
          roundId,
          eventId,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!res.ok) {
        if (res.status === 409) {
          setErrorMessage(
            "Esta categoria pode ter sido concluída em outra aba. Atualizando seu progresso…",
          );
          router.refresh();
          return;
        }
        throw new Error(data.error || "Não foi possível registrar seu voto.");
      }
      setSubmitted(true);
      toast.success("Voto registrado!");
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Não foi possível registrar seu voto.";
      setErrorMessage(
        `${message} Se a conexão falhou durante o envio, confira seu progresso antes de tentar novamente.`,
      );
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter((u) =>
    u.fullName.toLowerCase().includes(search.toLowerCase()),
  );

  if (submitted) {
    return (
      <section className="mx-auto max-w-xl rounded-2xl border border-green-500/60 bg-zinc-900 p-8 text-center">
        <h2 ref={stepHeadingRef} tabIndex={-1} className="text-2xl font-semibold">
          Voto registrado
        </h2>
        <p className="mt-3 text-orange-100">
          Seu voto foi salvo. Você pode continuar nas categorias que ainda não
          respondeu.
        </p>
        <button
          type="button"
          className="mt-6 rounded-xl bg-orange-400 px-6 py-3 font-semibold text-black"
          onClick={() => router.push(`/votacao/categories?eventId=${eventId}`)}
        >
          Continuar votação
        </button>
      </section>
    );
  }

  if (reviewing && selectedUserId) {
    const selectedUser = users.find((user) => user._id === selectedUserId);
    if (selectedUser) {
      return (
        <section
          aria-labelledby="vote-review-heading"
          className="mx-auto max-w-xl rounded-2xl border border-orange-400/60 bg-zinc-900 p-6 sm:p-8"
        >
          <h2
            ref={stepHeadingRef}
            id="vote-review-heading"
            tabIndex={-1}
            className="text-2xl font-semibold"
          >
            Confira sua escolha
          </h2>
          <p className="mt-2 text-orange-100">
            Confirme para registrar seu voto nesta categoria.
          </p>
          <div className="mx-auto my-6 max-w-xs">
            <UserCard user={selectedUser} selected />
          </div>
          {errorMessage && (
            <p role="alert" className="mb-4 text-red-300">
              {errorMessage}
            </p>
          )}
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <button
              type="button"
              className="rounded-xl border border-orange-300 px-5 py-3"
              onClick={() => {
                setErrorMessage(null);
                setReviewing(false);
              }}
              disabled={loading}
            >
              Alterar escolha
            </button>
            <button
              type="button"
              className="rounded-xl bg-orange-400 px-5 py-3 font-semibold text-black disabled:opacity-60"
              onClick={handleVote}
              disabled={loading}
            >
              {loading ? "Registrando voto…" : "Confirmar voto"}
            </button>
          </div>
        </section>
      );
    }
  }

  return (
    <div className="relative">
      <p className="mb-4 text-orange-100">
        Escolha uma pessoa para esta categoria. Você poderá conferir sua escolha
        antes de confirmar.
      </p>
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
            onClick={() => setSelectedUserId(user._id)}
            className="text-left"
            aria-pressed={selectedUserId === user._id}
          >
            <UserCard user={user} selected={selectedUserId === user._id} />
          </button>
        ))}
      </div>
      {errorMessage && (
        <p role="alert" className="mt-6 text-red-300">
          {errorMessage}
        </p>
      )}
      <button
        type="button"
        className="mt-8 rounded-xl border border-orange-300 px-5 py-3"
        onClick={() => router.push(`/votacao/categories?eventId=${eventId}`)}
      >
        Pular esta categoria
      </button>
      {selectedUserId && (
        <button
          type="button"
          className="fixed bottom-6 left-1/2 z-50 w-full max-w-xs -translate-x-1/2 rounded-2xl bg-orange-400 px-16 py-3 text-black shadow-lg lg:py-4 lg:text-xl"
          onClick={() => {
            setErrorMessage(null);
            setReviewing(true);
          }}
        >
          Revisar escolha
        </button>
      )}
    </div>
  );
}
