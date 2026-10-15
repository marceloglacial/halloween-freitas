"use client";

import { useCallback, useEffect, useState } from "react";

type AdminTally = {
  eventId: string;
  votingStatus: "not_started" | "open" | "ended";
  resultsPublished: boolean;
  participantCount: number;
  categories: {
    categoryId: string;
    title: string;
    icon: string;
    roundType: "primary" | "runoff" | null;
    roundStatus: "open" | "ended" | null;
    totalVotes: number;
    users: { _id: string; fullName: string; votes: number }[];
  }[];
};

function rankUsers(users: AdminTally["categories"][number]["users"]) {
  let previousVotes: number | undefined;
  let position = 0;
  return users.map((user, index) => {
    if (user.votes !== previousVotes) position = index + 1;
    previousVotes = user.votes;
    return { ...user, position };
  });
}

export function AdminTallyContent({ tally }: { tally: AdminTally }) {
  return (
    <div className="space-y-5">
      {tally.categories.map((category) => (
        <section
          key={category.categoryId}
          aria-labelledby={`tally-${category.categoryId}`}
          className="rounded-xl border border-white/20 p-4 md:p-5"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2
              id={`tally-${category.categoryId}`}
              className="text-xl font-semibold"
            >
              {category.icon} {category.title}
            </h2>
            <span className="text-sm text-gray-300">
              {category.roundType === "runoff"
                ? "Rodada de desempate"
                : category.roundType === "primary"
                  ? "Rodada primária"
                  : "Votação não iniciada"}
              {category.roundStatus === "open" ? " · Em andamento" : ""}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-300">
            {category.totalVotes} {category.totalVotes === 1 ? "voto" : "votos"}
          </p>
          {category.users.length === 0 ? (
            <p className="mt-4 rounded-lg bg-white/5 p-3 text-sm">
              {category.roundStatus === "ended"
                ? "Nenhum voto foi registrado nesta categoria. Não há vencedor."
                : "Nenhum voto registrado nesta rodada ainda."}
            </p>
          ) : (
            <ol className="mt-4 divide-y divide-white/10">
              {rankUsers(category.users).map((user) => (
                <li
                  key={user._id}
                  className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0"
                >
                  <span className="min-w-0 flex-1">
                    <span className="mr-2 text-orange-300">
                      {user.position === 1 ? "🥇" : `${user.position}º`}
                    </span>
                    {user.fullName}
                    {user.position === 1 && (
                      <span className="ml-2 text-xs text-orange-200">
                        {category.roundStatus === "open"
                          ? "Na liderança"
                          : "Primeiro lugar"}
                      </span>
                    )}
                  </span>
                  <span className="font-semibold">
                    {user.votes} {user.votes === 1 ? "voto" : "votos"}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
      ))}
    </div>
  );
}

export default function AdminResults({
  eventId,
  refreshKey = 0,
}: {
  eventId: string;
  refreshKey?: number;
}) {
  const [tally, setTally] = useState<AdminTally | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadTally = useCallback(
    async (signal?: AbortSignal) => {
      const response = await fetch(`/api/admin/events/${eventId}/results`, {
        cache: "no-store",
        signal,
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? "Não foi possível carregar a apuração");
      }
      return (await response.json()) as AdminTally;
    },
    [eventId],
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadTally(controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        setTally(data);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        setError(
          cause instanceof Error
            ? cause.message
            : "Não foi possível carregar a apuração",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [loadTally, refreshKey]);

  function refreshTally() {
    setLoading(true);
    setError(null);
    void loadTally()
      .then((data) => {
        setTally(data);
      })
      .catch((cause: unknown) => {
        setError(
          cause instanceof Error
            ? cause.message
            : "Não foi possível carregar a apuração",
        );
      })
      .finally(() => setLoading(false));
  }

  const visibleTally = tally?.eventId === eventId ? tally : null;

  return (
    <section className="space-y-5 rounded-xl bg-white/10 p-5 md:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Apuração interna</h1>
          <p className="mt-1 text-sm text-gray-300">
            Contagens e colocações privadas para administradores. A tela usa a
            rodada atual ou, quando encerrada, o resultado final de cada
            categoria.
          </p>
          {visibleTally && (
            <div className="mt-2 space-y-1 text-sm text-gray-300">
              <p>
                {visibleTally.resultsPublished
                  ? "Resultados publicados"
                  : "Resultados privados"}
              </p>
              <p>
                {visibleTally.participantCount}{" "}
                {visibleTally.participantCount === 1
                  ? "participante votou"
                  : "participantes votaram"}{" "}
                em pelo menos uma categoria exibida.
              </p>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={refreshTally}
          disabled={loading}
          className="rounded-lg border border-white/30 px-4 py-2 disabled:opacity-50"
        >
          {loading ? "Atualizando…" : "Atualizar contagem"}
        </button>
      </header>
      {error ? (
        <p role="alert" className="rounded-lg bg-red-950/60 p-4 text-red-100">
          {error}
        </p>
      ) : loading && !visibleTally ? (
        <p role="status" className="rounded-lg bg-white/5 p-4">
          Carregando a apuração…
        </p>
      ) : visibleTally?.categories.length ? (
        <AdminTallyContent tally={visibleTally} />
      ) : (
        <p className="rounded-lg bg-white/5 p-4">
          Esta edição ainda não tem categorias configuradas.
        </p>
      )}
    </section>
  );
}
