"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getAdminEnrollmentControls } from "@/util/admin-enrollment-controls";
import type { EventCategoryInput } from "@/lib/event-categories";
import type { AdminContestantEntrySummary } from "@/lib/contestant-entries";

type EditableCategory = EventCategoryInput & { _id?: string };

async function responseError(response: Response) {
  const body = (await response.json().catch(() => null)) as {
    error?: string;
  } | null;
  return body?.error || "Não foi possível concluir a operação.";
}

export function closeEnrollmentPrompt(confirmedRsvps: number) {
  if (confirmedRsvps <= 0) {
    return "Fechar as inscrições? Novos RSVPs e novos envios ou alterações de fotos do concurso ficarão indisponíveis até uma eventual reabertura.";
  }
  const guests =
    confirmedRsvps === 1
      ? "Há 1 convidado com presença confirmada."
      : `Há ${confirmedRsvps} convidados com presença confirmada.`;
  return `${guests} Ao fechar as inscrições, novos RSVPs e alterações no concurso ficarão indisponíveis. Somente convidados que já enviaram uma foto válida concorrerão. Deseja continuar?`;
}

export default function AdminEventContests({
  event: initialEvent,
  entries,
  confirmedRsvps,
  now,
}: {
  event: HalloweenEvent;
  entries: AdminContestantEntrySummary[];
  confirmedRsvps: number;
  now: string;
}) {
  const router = useRouter();
  const [event, setEvent] = useState(initialEvent);
  const [categories, setCategories] = useState<EditableCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const locked = event.votingStatus !== "not_started";
  const enrollment = getAdminEnrollmentControls(event, new Date(now));
  const entryClosed = event.contestEntryStatus === "closed";

  const fetchCategories = useCallback(
    async (signal?: AbortSignal) => {
      const response = await fetch(
        `/api/admin/events/${event._id}/categories`,
        {
          cache: "no-store",
          signal,
        },
      );
      if (!response.ok) throw new Error(await responseError(response));
      return (await response.json()) as EditableCategory[];
    },
    [event._id],
  );

  const loadCategories = useCallback(async () => {
    try {
      setCategories(await fetchCategories());
      setError(null);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível carregar as categorias.",
      );
    } finally {
      setLoading(false);
    }
  }, [fetchCategories]);

  useEffect(() => {
    const controller = new AbortController();
    void fetchCategories(controller.signal)
      .then((loaded) => {
        if (controller.signal.aborted) return;
        setCategories(loaded);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (cause instanceof Error && cause.name === "AbortError") return;
        if (!controller.signal.aborted) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Não foi possível carregar as categorias.",
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [fetchCategories]);

  function updateCategory(index: number, changes: Partial<EditableCategory>) {
    setCategories((current) =>
      current.map((category, itemIndex) =>
        itemIndex === index ? { ...category, ...changes } : category,
      ),
    );
  }

  function moveCategory(index: number, offset: -1 | 1) {
    setCategories((current) => {
      const target = index + offset;
      if (target < 0 || target >= current.length) return current;
      const reordered = [...current];
      [reordered[index], reordered[target]] = [
        reordered[target],
        reordered[index],
      ];
      return reordered.map((category, order) => ({ ...category, order }));
    });
  }

  async function saveCategories() {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/admin/events/${event._id}/categories`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ categories }),
        },
      );
      if (!response.ok) throw new Error(await responseError(response));
      setCategories((await response.json()) as EditableCategory[]);
      toast.success("Categorias atualizadas");
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : "Não foi possível atualizar as categorias.";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function changeContestEntryStatus() {
    const action = entryClosed ? "reopen-contest-entry" : "close-contest-entry";
    const prompt = entryClosed
      ? "Reabrir os RSVPs e as inscrições do concurso para esta edição?"
      : closeEnrollmentPrompt(confirmedRsvps);
    if (!window.confirm(prompt)) return;

    setBusy(true);
    setError(null);
    try {
      const requestChange = (confirmExistingRsvps: boolean) =>
        fetch(`/api/admin/events/${event._id}/lifecycle`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            ...(action === "close-contest-entry"
              ? { confirmExistingRsvps }
              : {}),
          }),
        });
      let response = await requestChange(
        action === "close-contest-entry" && confirmedRsvps > 0,
      );
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
          code?: string;
          confirmedRsvps?: number;
        } | null;
        if (
          action === "close-contest-entry" &&
          response.status === 409 &&
          body?.code === "rsvp_confirmation_required" &&
          typeof body.confirmedRsvps === "number"
        ) {
          if (!window.confirm(closeEnrollmentPrompt(body.confirmedRsvps))) {
            return;
          }
          response = await requestChange(true);
        } else {
          throw new Error(
            body?.error || "Não foi possível concluir a operação.",
          );
        }
      }
      if (!response.ok) throw new Error(await responseError(response));
      setEvent((await response.json()) as HalloweenEvent);
      toast.success(
        entryClosed ? "Inscrições reabertas" : "Inscrições fechadas",
      );
      router.refresh();
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : "Não foi possível alterar as inscrições.";
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-white/10 bg-stone-950/80 p-5 sm:p-6">
        <p className="text-xs font-semibold tracking-[0.2em] text-orange-300 uppercase">
          Concursos · edição {event.year}
        </p>
        <h1 className="mt-2 text-2xl font-semibold">{event.title}</h1>
        {event.status === "archived" && (
          <p className="mt-3 rounded-lg border border-amber-300/20 bg-amber-300/5 p-3 text-sm text-amber-100">
            Edição arquivada. Categorias e inscrições ficam disponíveis para
            consulta; operações seguem os limites do lifecycle e do servidor.
          </p>
        )}
      </header>

      <section
        aria-labelledby="contest-categories-heading"
        className="space-y-4 rounded-xl bg-white/10 p-4 md:p-6"
      >
        <div>
          <h2 id="contest-categories-heading" className="text-2xl font-bold">
            Categorias do concurso
          </h2>
          <p className="mt-1 text-sm text-gray-300">
            Ordem e elegibilidade pertencem somente à edição selecionada. As
            categorias ficam bloqueadas na primeira abertura da votação.
          </p>
        </div>
        {loading ? (
          <p role="status" className="rounded-lg bg-white/5 p-4">
            Carregando categorias…
          </p>
        ) : error && categories.length === 0 ? (
          <div>
            <p role="alert" className="rounded-lg bg-red-950/70 p-4">
              {error}
            </p>
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                setError(null);
                void loadCategories();
              }}
              className="mt-3 rounded-lg border border-white/30 px-4 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300"
            >
              Tentar novamente
            </button>
          </div>
        ) : (
          <>
            {categories.length === 0 && (
              <p className="rounded-lg bg-white/5 p-4 text-sm text-gray-300">
                Esta edição não tem categorias. Adicione uma categoria para
                configurar o concurso.
              </p>
            )}
            <ol className="space-y-3">
              {categories.map((category, index) => (
                <li
                  key={category._id ?? `new-${index}`}
                  className="grid gap-3 rounded-lg border border-white/10 p-3 md:grid-cols-[minmax(0,1fr)_8rem_minmax(10rem,0.7fr)_auto]"
                >
                  <label className="grid gap-1 text-sm">
                    Nome
                    <input
                      required
                      minLength={2}
                      maxLength={80}
                      disabled={locked || saving}
                      value={category.title}
                      onChange={(e) =>
                        updateCategory(index, { title: e.target.value })
                      }
                      className="rounded border border-white/20 bg-white/10 px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300 disabled:opacity-60"
                    />
                  </label>
                  <label className="grid gap-1 text-sm">
                    Ícone
                    <input
                      maxLength={16}
                      disabled={locked || saving}
                      value={category.icon}
                      onChange={(e) =>
                        updateCategory(index, { icon: e.target.value })
                      }
                      className="rounded border border-white/20 bg-white/10 px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300 disabled:opacity-60"
                    />
                  </label>
                  <label className="grid gap-1 text-sm">
                    Elegibilidade
                    <select
                      disabled={locked || saving}
                      value={category.eligibility}
                      onChange={(e) =>
                        updateCategory(index, {
                          eligibility: e.target
                            .value as EventCategoryInput["eligibility"],
                        })
                      }
                      className="rounded border border-white/20 bg-black px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300 disabled:opacity-60"
                    >
                      <option value="all">Todas as entradas</option>
                      <option value="group">Grupos ou duplas</option>
                    </select>
                  </label>
                  <div className="flex items-end gap-2">
                    <button
                      type="button"
                      aria-label={`Mover ${category.title || `categoria ${index + 1}`} para cima`}
                      disabled={locked || saving || index === 0}
                      onClick={() => moveCategory(index, -1)}
                      className="rounded bg-gray-700 px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300 disabled:opacity-50"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      aria-label={`Mover ${category.title || `categoria ${index + 1}`} para baixo`}
                      disabled={
                        locked || saving || index === categories.length - 1
                      }
                      onClick={() => moveCategory(index, 1)}
                      className="rounded bg-gray-700 px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300 disabled:opacity-50"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      disabled={locked || saving || categories.length <= 1}
                      onClick={() =>
                        setCategories((current) =>
                          current
                            .filter((_, itemIndex) => itemIndex !== index)
                            .map((item, order) => ({ ...item, order })),
                        )
                      }
                      className="rounded bg-gray-700 px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300 disabled:opacity-50"
                    >
                      Remover
                    </button>
                  </div>
                </li>
              ))}
            </ol>
            {error && (
              <p role="alert" className="text-sm text-red-300">
                {error}
              </p>
            )}
            {locked ? (
              <p
                role="status"
                className="rounded-lg bg-white/5 p-3 text-sm text-gray-300"
              >
                A primeira abertura da votação bloqueou alterações nas
                categorias desta edição.
              </p>
            ) : (
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={saving || loading || categories.length >= 30}
                  onClick={() =>
                    setCategories((current) => [
                      ...current,
                      {
                        title: "",
                        icon: "",
                        order: current.length,
                        eligibility: "all",
                      },
                    ])
                  }
                  className="rounded border border-white/30 px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300 disabled:opacity-50"
                >
                  Adicionar categoria
                </button>
                <button
                  type="button"
                  disabled={saving || loading || categories.length === 0}
                  onClick={() => void saveCategories()}
                  className="rounded-lg bg-orange-500 px-4 py-2 font-semibold text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300 disabled:opacity-50"
                >
                  {saving ? "Salvando…" : "Salvar categorias"}
                </button>
              </div>
            )}
          </>
        )}
      </section>

      <section
        aria-labelledby="contest-entry-heading"
        className="space-y-4 rounded-xl bg-white/10 p-4 md:p-6"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="contest-entry-heading" className="text-2xl font-bold">
              Inscrições do concurso
            </h2>
            <p className="mt-1 text-sm text-gray-300">
              {enrollment.contestantState === "upcoming"
                ? "As inscrições abrem no início programado desta edição."
                : entryClosed
                  ? "RSVPs e inscrições do concurso estão fechados para esta edição."
                  : "RSVPs e inscrições do concurso estão abertos para esta edição."}
            </p>
            <p className="mt-1 text-sm text-gray-300">
              Fechar inscrições interrompe novos RSVPs e alterações no concurso.
              Ao iniciar a votação, a participação é congelada permanentemente.
            </p>
          </div>
          <span
            role="status"
            className={`rounded-full px-3 py-1 text-sm font-semibold ${entryClosed || enrollment.contestantState === "upcoming" ? "bg-gray-700 text-gray-200" : "bg-green-700 text-green-100"}`}
          >
            {enrollment.contestantState === "upcoming"
              ? "Agendadas"
              : entryClosed
                ? "Fechadas"
                : "Abertas"}
          </span>
        </div>
        <button
          type="button"
          disabled={busy || event.status !== "active" || locked}
          onClick={() => void changeContestEntryStatus()}
          className="rounded-lg bg-orange-500 px-4 py-2 font-semibold text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300 disabled:opacity-50"
        >
          {busy
            ? "Salvando…"
            : entryClosed
              ? "Reabrir inscrições"
              : "Fechar inscrições"}
        </button>
        {event.status !== "active" && (
          <p className="text-sm text-gray-300">
            Ative esta edição para alterar as inscrições.
          </p>
        )}
        {locked && (
          <p className="text-sm text-gray-300">
            As inscrições não podem ser alteradas após a primeira abertura da
            votação.
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-red-300">
            {error}
          </p>
        )}
        <div className="border-t border-white/15 pt-4">
          <div className="mb-3">
            <h3 className="text-lg font-semibold">
              Inscrições recebidas · {entries.length}
            </h3>
            <p className="mt-1 text-sm text-gray-300">
              Lista de inscrições desta edição. Rascunhos ficam visíveis apenas
              para administradores; a edição das inscrições acontece no fluxo do
              convidado.
            </p>
          </div>
          {entries.length === 0 ? (
            <p className="rounded-lg border border-dashed border-white/20 p-5 text-center text-sm text-gray-300">
              Ainda não há inscrições nesta edição.
            </p>
          ) : (
            <ul className="space-y-3">
              {entries.map((entry) => (
                <li
                  key={entry._id}
                  className="flex flex-col gap-3 rounded-lg border border-white/10 bg-black/20 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-semibold">{entry.displayName}</p>
                    <p className="text-sm text-gray-300">
                      {entry.costumeTitle || "Fantasia sem título"}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      {entry.categoryIcon} {entry.categoryTitle} ·{" "}
                      {entry.entryType === "group"
                        ? "Grupo ou dupla"
                        : "Individual"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-white/10 px-3 py-1">
                      {entry.status === "draft"
                        ? "Rascunho"
                        : entry.status === "ready"
                          ? "Pronta"
                          : entry.status === "locked"
                            ? "Congelada para votação"
                            : "Retirada"}
                    </span>
                    <span className="rounded-full bg-white/10 px-3 py-1">
                      {entry.hasPhoto ? "Foto autorizada" : "Foto pendente"}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
