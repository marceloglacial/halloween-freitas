"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { guestAccessUrl } from "@/util/guest-access";

type EventSummary = {
  title: string;
  year: number;
  status: "active" | "archived";
  contestEntryStatus?: "open" | "closed";
  votingStatus: "not_started" | "open" | "ended";
};

type GuestProfile = { fullName: string; event: EventSummary };

export default function GuestProfileForm({
  eventId,
  eventTitle,
  eventYear,
}: {
  eventId: string;
  eventTitle: string;
  eventYear: number;
}) {
  const [profile, setProfile] = useState<GuestProfile | null>(null);
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/guest-profile?eventId=${encodeURIComponent(eventId)}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok)
          throw new Error(
            data.error || "Não foi possível carregar seu perfil.",
          );
        setProfile(data);
        setFullName(data.fullName);
      })
      .catch((failure: unknown) => {
        if (!controller.signal.aborted)
          setError(
            failure instanceof Error
              ? failure.message
              : "Erro de conexão. Tente novamente.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [eventId]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/guest-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, fullName }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Não foi possível salvar seu nome.");
      setProfile(data);
      setFullName(data.fullName);
      setMessage("Seu nome foi atualizado.");
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Erro de conexão. Tente novamente.",
      );
    } finally {
      setSaving(false);
    }
  }

  const accessUrl = guestAccessUrl(
    eventId,
    `/perfil?${new URLSearchParams({ eventId })}`,
  );

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col items-center justify-center gap-8 px-4 py-12 text-center">
      <div className="grid gap-2">
        <p className="text-orange-300">
          {eventTitle} · {eventYear}
        </p>
        <h1 className="text-5xl">Meu perfil</h1>
        <p className="text-stone-300">
          Consulte sua presença e atualize seu nome neste evento.
        </p>
      </div>

      {loading ? (
        <p role="status">Carregando seu perfil...</p>
      ) : profile ? (
        <div className="grid w-full gap-6 rounded-2xl border border-white/10 bg-stone-900 p-6 text-left">
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div>
              <dt className="text-sm text-stone-400">Sua presença</dt>
              <dd>Confirmada</dd>
            </div>
            <div>
              <dt className="text-sm text-stone-400">Evento</dt>
              <dd>
                {profile.event.title} · {profile.event.year}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-stone-400">Edição</dt>
              <dd>
                {profile.event.status === "active" ? "Ativa" : "Arquivada"}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-stone-400">Inscrições do concurso</dt>
              <dd>
                {profile.event.contestEntryStatus === "closed"
                  ? "Encerradas"
                  : "Abertas"}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-stone-400">Votação</dt>
              <dd>
                {profile.event.votingStatus === "open"
                  ? "Aberta"
                  : profile.event.votingStatus === "ended"
                    ? "Encerrada"
                    : "Ainda não começou"}
              </dd>
            </div>
          </dl>
          <form className="grid gap-4" onSubmit={save}>
            <label className="grid gap-2" htmlFor="fullName">
              <span>Nome e sobrenome</span>
              <input
                id="fullName"
                name="fullName"
                autoComplete="name"
                maxLength={120}
                required
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className="rounded-xl border border-orange-400 bg-black px-4 py-3 text-white outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
              />
            </label>
            {profile.event.contestEntryStatus === "closed" ||
            profile.event.votingStatus !== "not_started" ? (
              <p className="text-sm text-stone-300">
                Atualizar seu perfil não altera o nome já congelado no concurso.
              </p>
            ) : null}
            {error && (
              <p role="alert" className="text-red-400">
                {error}
              </p>
            )}
            {message && (
              <p role="status" className="text-green-400">
                {message}
              </p>
            )}
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-orange-400 px-5 py-3 font-semibold text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300 disabled:opacity-60"
            >
              {saving ? "Salvando..." : "Salvar nome"}
            </button>
          </form>
        </div>
      ) : (
        <div className="grid w-full gap-4 rounded-2xl border border-white/10 bg-stone-900 p-6">
          <p role="alert" className="text-orange-200">
            {error}
          </p>
          <Link
            href={accessUrl}
            className="rounded-xl bg-orange-400 px-5 py-3 font-semibold text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300"
          >
            Entrar com o email da confirmação
          </Link>
        </div>
      )}

      <Link
        href="/"
        className="text-orange-300 underline focus-visible:outline-2"
      >
        Voltar ao início
      </Link>
    </main>
  );
}
