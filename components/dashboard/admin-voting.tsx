"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import AdminResults from "@/components/dashboard/admin-results";

async function responseError(response: Response) {
  const body = (await response.json().catch(() => null)) as {
    error?: string;
  } | null;
  return body?.error || "Não foi possível concluir a operação.";
}

export default function AdminVoting({
  event: initialEvent,
  now,
}: {
  event: HalloweenEvent;
  now: string;
}) {
  const router = useRouter();
  const [event, setEvent] = useState(initialEvent);
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const eventHasStarted =
    new Date(event.eventStartsAt).getTime() <= new Date(now).getTime();
  const canOpen =
    event.status === "active" &&
    eventHasStarted &&
    event.contestEntryStatus === "closed";
  const canControlRound =
    event.status === "active" && event.votingStatus === "open";
  const canPublish = event.votingStatus === "ended";

  async function changeLifecycle(
    action:
      "start-voting" | "end-voting" | "publish-results" | "unpublish-results",
  ) {
    const prompts = {
      "start-voting":
        event.votingStatus === "ended"
          ? "Reabrir a rodada atual? Resultados publicados serão ocultados. Votos já registrados serão preservados."
          : "Iniciar a votação? Novas confirmações e inclusões ou exclusões de participantes serão encerradas permanentemente.",
      "end-voting":
        "Encerrar a rodada? Se houver empate no primeiro lugar, uma rodada de desempate será aberta automaticamente.",
      "publish-results": "Liberar os resultados para todos nesta edição?",
      "unpublish-results":
        "Ocultar os resultados liberados ao público nesta edição?",
    };
    if (!window.confirm(prompts[action])) return;

    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/events/${event._id}/lifecycle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!response.ok) throw new Error(await responseError(response));
      setEvent((await response.json()) as HalloweenEvent);
      setRevision((current) => current + 1);
      const success = {
        "start-voting":
          event.votingStatus === "ended"
            ? "Votação reaberta; resultados ocultados"
            : "Votação iniciada",
        "end-voting":
          response.headers.get("X-Runoff-Opened") === "true"
            ? "Empate no primeiro lugar; rodada de desempate iniciada"
            : "Votação encerrada",
        "publish-results": "Resultados liberados para todos",
        "unpublish-results": "Resultados públicos ocultados",
      };
      toast.success(success[action]);
      router.refresh();
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : "Não foi possível alterar o lifecycle da votação.";
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  const statusLabel = {
    not_started: "Não iniciada",
    open: "Aberta",
    ended: "Encerrada",
  }[event.votingStatus];

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-white/10 bg-stone-950/80 p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-4xl text-orange-300 sm:text-5xl">Votação</h1>
          <p
            role="status"
            aria-label={`Estado da votação: ${statusLabel}`}
            className="ml-auto inline-flex rounded-full bg-orange-300/15 px-3 py-1 font-semibold text-orange-100"
          >
            {statusLabel}
          </p>
        </div>
        {event.status === "archived" && (
          <p className="mt-3 rounded-lg border border-amber-300/20 bg-amber-300/5 p-3 text-sm text-amber-100">
            Edição arquivada. Estado e apuração históricos permanecem
            disponíveis; as regras do servidor controlam as ações possíveis.
          </p>
        )}
      </header>

      <section
        aria-labelledby="voting-state-heading"
        className="space-y-4 rounded-xl bg-white/10 p-4 md:p-6"
      >
        <div>
          <h2 id="voting-state-heading" className="text-2xl font-bold">
            Estado da votação
          </h2>
          <p className="mt-1 text-sm text-gray-300">
            O status é manual e validado pelo servidor. Abrir a primeira rodada
            congela inscrições e confirmações desta edição.
          </p>
        </div>
        {event.votingStatus === "not_started" && (
          <p className="text-sm text-gray-300">
            {event.status !== "active"
              ? "Ative esta edição para iniciar a votação."
              : !eventHasStarted
                ? "A votação só pode começar após o início programado do evento."
                : event.contestEntryStatus !== "closed"
                  ? "Feche as inscrições do concurso antes de iniciar a votação."
                  : "A edição está pronta para iniciar a primeira rodada."}
          </p>
        )}
        <button
          type="button"
          disabled={
            busy ||
            (event.votingStatus === "open" ? !canControlRound : !canOpen)
          }
          onClick={() =>
            void changeLifecycle(
              event.votingStatus === "open" ? "end-voting" : "start-voting",
            )
          }
          className="rounded-lg bg-orange-500 px-4 py-2 font-semibold text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300 disabled:opacity-50"
        >
          {busy
            ? "Salvando…"
            : event.votingStatus === "open"
              ? "Encerrar votação"
              : event.votingStatus === "ended"
                ? "Reabrir votação"
                : "Iniciar votação"}
        </button>
        {event.votingStatus === "ended" && (
          <p className="text-sm text-gray-300">
            Reabrir mantém os votos anteriores e oculta resultados publicados.
            Cada convidado pode completar somente as categorias pendentes.
          </p>
        )}
      </section>

      <section
        aria-labelledby="results-publication-heading"
        className="space-y-4 rounded-xl border border-white/15 bg-black/20 p-4 md:p-6"
      >
        <div>
          <h2 id="results-publication-heading" className="text-2xl font-bold">
            Liberação pública dos resultados
          </h2>
          <p className="mt-1 text-sm text-gray-300">
            Durante a festa, somente o admin vê a apuração para apresentá-la na
            transmissão ao vivo. Depois, libere os resultados para todos. Essa
            opção fica disponível quando a rodada final for encerrada.
          </p>
          <p role="status" className="mt-2 text-sm font-semibold">
            {event.resultsPublished
              ? "Resultados liberados para todos"
              : "Ainda privados; visíveis apenas para o admin"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={busy || !canPublish}
            onClick={() =>
              void changeLifecycle(
                event.resultsPublished
                  ? "unpublish-results"
                  : "publish-results",
              )
            }
            className="rounded-lg bg-green-600 px-4 py-2 font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-300 disabled:opacity-50"
          >
            {busy
              ? "Salvando…"
              : event.resultsPublished
                ? "Ocultar resultados"
                : "Liberar resultados para todos"}
          </button>
          <Link
            href={`/resultados?event=${encodeURIComponent(event.slug)}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-orange-300 px-4 py-2 font-semibold text-orange-100 transition hover:bg-orange-300/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300"
          >
            Ver resultados
          </Link>
        </div>
        {!canPublish && (
          <p className="text-sm text-gray-300">
            Encerre a rodada final antes de publicar ou ocultar resultados.
          </p>
        )}
      </section>

      {error && (
        <p role="alert" className="rounded-lg bg-red-950/70 p-4 text-red-100">
          {error}
        </p>
      )}
      <AdminResults
        key={`${event._id}-${revision}`}
        eventId={event._id}
        refreshKey={revision}
      />
    </div>
  );
}
