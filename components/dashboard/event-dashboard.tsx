"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  cascadeScheduleField,
  EventDateField,
  EventInput,
  ScheduleCollision,
  eventDateLabels,
  eventDateFields,
  eventToLocalSchedule,
  getScheduleFieldBounds,
  getScheduleCollisions,
  scheduleCollisionMessage,
  shiftEventSchedule,
} from "@/lib/event-schedule";
import {
  DEFAULT_EVENT_CATEGORIES,
  type EventCategoryInput,
} from "@/lib/event-categories";
import { getAdminEnrollmentControls } from "@/util/admin-enrollment-controls";
import AdminResults from "@/components/dashboard/admin-results";
import AdminPartyAlbum from "@/components/dashboard/admin-party-album";

export type DashboardTab = "settings" | "results" | "photos";
type EditableCategory = EventCategoryInput & { _id?: string };

const scheduleHelpText: Partial<Record<EventDateField, string>> = {
  eventStartsAt:
    "A votação só pode ser aberta por um administrador após este horário.",
};

function eventForm(event: HalloweenEvent): EventInput {
  return {
    year: event.year,
    title: event.title,
    timezone: event.timezone,
    ...eventToLocalSchedule(event),
  };
}

function newEventForm(year: number): EventInput {
  return {
    year,
    title: `Halloween dos Freitas ${year}`,
    timezone: "America/Toronto",
    registrationStartsAt: `${year}-08-01T18:00`,
    eventStartsAt: `${year}-10-31T20:00`,
  };
}

function formatEventDate(value: string, timezone: string) {
  return new Date(value).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: timezone,
  });
}

async function responseError(response: Response) {
  const data = (await response.json().catch(() => null)) as {
    error?: string;
  } | null;
  return data?.error || "Não foi possível concluir a operação";
}

function EventForm({
  value,
  setValue,
  disabled,
  yearDisabled,
  collisions,
  onDateChange,
}: {
  value: EventInput;
  setValue: (value: EventInput) => void;
  disabled: boolean;
  yearDisabled: boolean;
  collisions: ScheduleCollision[];
  onDateChange: (field: EventDateField, value: string) => void;
}) {
  return (
    <div className="space-y-5">
      <fieldset className="grid gap-4 rounded-xl border border-white/15 p-4 md:grid-cols-2">
        <legend className="px-2 text-lg font-semibold">
          Detalhes da edição
        </legend>
        <label className="grid gap-1 text-sm">
          Ano
          <input
            type="number"
            min="2000"
            max="2100"
            required
            disabled={disabled || yearDisabled}
            value={value.year}
            onChange={(event) =>
              setValue({ ...value, year: Number(event.target.value) })
            }
            className="rounded border border-white/20 bg-white/10 px-3 py-2 disabled:opacity-60"
          />
        </label>
        <label className="grid gap-1 text-sm">
          Título
          <input
            required
            minLength={2}
            maxLength={120}
            disabled={disabled}
            value={value.title}
            onChange={(event) =>
              setValue({ ...value, title: event.target.value })
            }
            className="rounded border border-white/20 bg-white/10 px-3 py-2"
          />
        </label>
        <label className="grid gap-1 text-sm md:col-span-2">
          Fuso horário IANA
          <input
            required
            disabled={disabled}
            value={value.timezone}
            onChange={(event) =>
              setValue({ ...value, timezone: event.target.value })
            }
            placeholder="America/Toronto"
            className="rounded border border-white/20 bg-white/10 px-3 py-2"
          />
        </label>
      </fieldset>
      <fieldset className="grid gap-4 rounded-xl border border-white/15 p-4 md:grid-cols-2">
        <legend className="px-2 text-lg font-semibold">Agenda</legend>
        <p className="text-sm text-gray-300 md:col-span-2">
          Os horários são interpretados no fuso informado acima. A
          disponibilidade de confirmações e inscrições segue o lifecycle da
          edição.
        </p>
        {eventDateFields.map((field) => {
          const bounds = getScheduleFieldBounds(value, field, value.year);
          const helpText = scheduleHelpText[field];
          const fieldCollisions = collisions.filter(
            ({ earlierField, laterField }) =>
              earlierField === field || laterField === field,
          );
          const fieldMessages = collisions.filter(
            ({ laterField }) => laterField === field,
          );
          const describedBy = fieldCollisions
            .map(
              ({ earlierField, laterField }) =>
                `schedule-error-${earlierField}-${laterField}`,
            )
            .concat(helpText ? `schedule-shift-help-${field}` : [])
            .join(" ");

          return (
            <label key={field} className="grid gap-1 text-sm">
              {eventDateLabels[field]}
              <input
                type="datetime-local"
                step="60"
                min={bounds.min}
                max={bounds.max}
                required
                disabled={disabled}
                value={value[field]}
                aria-invalid={fieldCollisions.length > 0 || undefined}
                aria-describedby={describedBy || undefined}
                onChange={(event) => onDateChange(field, event.target.value)}
                className={`rounded border bg-white/10 px-3 py-2 read-only:cursor-not-allowed read-only:opacity-70 ${
                  fieldCollisions.length > 0
                    ? "border-red-500 ring-1 ring-red-500"
                    : "border-white/20"
                }`}
              />
              {helpText && (
                <span
                  id={`schedule-shift-help-${field}`}
                  className="text-xs text-gray-300"
                >
                  {helpText}
                </span>
              )}
              {fieldMessages.map((collision) => (
                <span
                  key={`${collision.earlierField}-${collision.laterField}`}
                  id={`schedule-error-${collision.earlierField}-${collision.laterField}`}
                  aria-live="polite"
                  className="text-sm text-red-400"
                >
                  {scheduleCollisionMessage(collision)}
                </span>
              ))}
            </label>
          );
        })}
      </fieldset>
    </div>
  );
}

export default function EventDashboard({
  initialEvents,
  initialCategories,
  initialYear,
  initialTab,
  initialNow,
}: {
  initialEvents: HalloweenEvent[];
  initialCategories: Category[];
  initialYear?: number;
  initialTab: DashboardTab;
  initialNow: string;
}) {
  const router = useRouter();
  const [events, setEvents] = useState(initialEvents);
  const [categoryDraft, setCategoryDraft] = useState<EditableCategory[]>(
    initialCategories.length > 0
      ? initialCategories
      : [{ title: "", icon: "", order: 0, eligibility: "all" }],
  );
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoriesReady, setCategoriesReady] = useState(
    initialEvents.length > 0,
  );
  const [savingCategories, setSavingCategories] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [year, setYear] = useState(initialYear ?? initialEvents[0]?.year);
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(
    initialEvents.length === 0 && initialTab === "settings",
  );
  const selected = events.find((event) => event.year === year) ?? events[0];
  const enrollmentControls = selected
    ? getAdminEnrollmentControls(selected, new Date(initialNow))
    : null;
  const contestEntryState = enrollmentControls?.contestantState ?? "closed";
  const eventHasStarted = selected
    ? new Date(selected.eventStartsAt).getTime() <=
      new Date(initialNow).getTime()
    : false;
  const [draft, setDraft] = useState<EventInput | null>(
    selected
      ? eventForm(selected)
      : newEventForm(initialYear ?? Number(initialNow.slice(0, 4))),
  );
  const collisions = useMemo(
    () => (draft ? getScheduleCollisions(draft) : []),
    [draft],
  );

  const nextYear = useMemo(
    () =>
      Math.max(
        new Date().getFullYear(),
        ...events.map((event) => event.year + 1),
      ),
    [events],
  );

  async function loadCategories(eventId: string) {
    setCategoriesLoading(true);
    setCategoriesReady(false);
    setCategoryDraft([]);
    setCategoryError(null);
    try {
      const response = await fetch(`/api/admin/events/${eventId}/categories`);
      if (!response.ok) throw new Error(await responseError(response));
      const loaded = (await response.json()) as Category[];
      setCategoryDraft(loaded);
      setCategoriesReady(true);
    } catch (error) {
      setCategoryError(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar as categorias",
      );
    } finally {
      setCategoriesLoading(false);
    }
  }

  async function saveCategories() {
    if (!selected || !categoriesReady) return;
    setSavingCategories(true);
    setCategoryError(null);
    try {
      const response = await fetch(
        `/api/admin/events/${selected._id}/categories`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ categories: categoryDraft }),
        },
      );
      if (!response.ok) throw new Error(await responseError(response));
      const saved = (await response.json()) as Category[];
      setCategoryDraft(saved);
      toast.success("Categorias atualizadas");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar as categorias";
      setCategoryError(message);
      toast.error(message);
    } finally {
      setSavingCategories(false);
    }
  }

  function updateCategory(index: number, changes: Partial<EditableCategory>) {
    setCategoryDraft((current) =>
      current.map((category, itemIndex) =>
        itemIndex === index ? { ...category, ...changes } : category,
      ),
    );
  }

  function moveCategory(index: number, offset: -1 | 1) {
    setCategoryDraft((current) => {
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

  function replaceEvent(event: HalloweenEvent) {
    setEvents((current) =>
      current
        .map((item) => (item._id === event._id ? event : item))
        .sort((a, b) => b.year - a.year),
    );
    const nextDraft = eventForm(event);
    setDraft(nextDraft);
  }

  function updateEventDate(field: EventDateField, nextValue: string) {
    if (!draft) return;
    const nextSchedule = cascadeScheduleField(draft, field, nextValue);
    setDraft({ ...draft, ...nextSchedule });
  }

  async function saveEvent(event: FormEvent) {
    event.preventDefault();
    if (!selected || !draft) return;
    if (collisions.length > 0) {
      toast.error(scheduleCollisionMessage(collisions[0]));
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/events/${selected._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!response.ok) throw new Error(await responseError(response));
      replaceEvent(await response.json());
      toast.success("Evento atualizado");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro inesperado");
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus(action: "activate" | "archive") {
    if (!selected) return;
    const activeEvent = events.find((event) => event.status === "active");
    const message =
      action === "activate"
        ? `Ativar ${selected.year} e arquivar ${activeEvent?.year ?? "a edição ativa atual"}? Uma votação aberta será encerrada; os dados serão preservados.`
        : `Arquivar o evento de ${selected.year}? Esta ação preserva os dados e encerra uma votação que esteja aberta.`;
    if (!window.confirm(message)) return;
    setBusy(true);
    try {
      const response = await fetch(
        `/api/admin/events/${selected._id}/${action}`,
        { method: "POST" },
      );
      if (!response.ok) throw new Error(await responseError(response));
      const changed = (await response.json()) as HalloweenEvent;
      setEvents((current) =>
        current.map((item) => ({
          ...item,
          status:
            action === "activate"
              ? item._id === changed._id
                ? "active"
                : "archived"
              : item._id === changed._id
                ? "archived"
                : item.status,
        })),
      );
      const nextDraft = eventForm(changed);
      setDraft(nextDraft);
      toast.success(
        action === "activate" ? "Evento ativado" : "Evento arquivado",
      );
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro inesperado");
    } finally {
      setBusy(false);
    }
  }

  async function changeLifecycle(
    action:
      | "close-contest-entry"
      | "reopen-contest-entry"
      | "start-voting"
      | "end-voting"
      | "publish-results"
      | "unpublish-results",
  ) {
    if (!selected) return;
    const messages = {
      "close-contest-entry":
        "Fechar as inscrições do concurso? As confirmações de presença continuam disponíveis.",
      "reopen-contest-entry": "Reabrir as inscrições do concurso?",
      "start-voting":
        selected.votingStatus === "ended"
          ? "Reabrir a rodada atual? Os resultados serão ocultados automaticamente. Inscrições e votos já registrados serão preservados; cada convidado poderá votar apenas nas categorias pendentes."
          : "Iniciar a votação agora? Novas confirmações de presença e inclusões ou exclusões de participantes serão encerradas permanentemente.",
      "end-voting":
        "Encerrar a rodada atual? Se houver empate no primeiro lugar em alguma categoria, uma rodada de desempate será aberta automaticamente.",
      "publish-results": "Publicar os resultados agora?",
      "unpublish-results": "Ocultar os resultados agora?",
    };
    if (!window.confirm(messages[action])) return;

    setBusy(true);
    try {
      const response = await fetch(
        `/api/admin/events/${selected._id}/lifecycle`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        },
      );
      if (!response.ok) throw new Error(await responseError(response));
      const changed = (await response.json()) as HalloweenEvent;
      replaceEvent(changed);
      const successMessages = {
        "close-contest-entry": "Inscrições do concurso fechadas",
        "reopen-contest-entry": "Inscrições do concurso reabertas",
        "start-voting": "Votação aberta",
        "end-voting": "Votação encerrada",
        "publish-results": "Resultados publicados",
        "unpublish-results": "Resultados ocultados",
      };
      toast.success(
        action === "end-voting" &&
          response.headers.get("X-Runoff-Opened") === "true"
          ? "Empate no primeiro lugar; rodada de desempate iniciada"
          : successMessages[action],
      );
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro inesperado");
    } finally {
      setBusy(false);
    }
  }

  function openCreate() {
    const nextDraft = selected
      ? {
          year: nextYear,
          title: `Halloween dos Freitas ${nextYear}`,
          timezone: selected.timezone,
          ...shiftEventSchedule(selected, nextYear),
        }
      : newEventForm(nextYear);
    setCreating(true);
    setDraft(nextDraft);
  }

  async function createEvent(event: FormEvent) {
    event.preventDefault();
    if (!draft) return;
    if (collisions.length > 0) {
      toast.error(scheduleCollisionMessage(collisions[0]));
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/admin/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!response.ok) throw new Error(await responseError(response));
      const created = (await response.json()) as HalloweenEvent;
      setEvents((current) =>
        [...current, created].sort((a, b) => b.year - a.year),
      );
      const nextDraft = eventForm(created);
      await loadCategories(created._id);
      setCreating(false);
      setDraft(nextDraft);
      setYear(created.year);
      router.replace(`/dashboard/configuracoes?year=${created.year}`);
      router.refresh();
      toast.success("Evento e categorias padrão criados");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro inesperado");
    } finally {
      setBusy(false);
    }
  }

  if (!draft) {
    return (
      <section className="rounded-xl bg-white/10 p-6">
        <h1 className="text-3xl font-bold">Eventos</h1>
        <p className="mt-3">Nenhum evento cadastrado.</p>
        <button
          type="button"
          onClick={openCreate}
          className="mt-4 rounded-lg bg-orange-500 px-4 py-2 font-semibold text-black"
        >
          Criar primeiro evento
        </button>
      </section>
    );
  }

  if (!selected && !creating) {
    return (
      <section className="rounded-2xl border border-white/10 bg-stone-900/80 p-6 sm:p-8">
        <h1 className="text-2xl font-semibold">Nenhuma edição disponível</h1>
        <p className="mt-3 max-w-2xl text-gray-300">
          Crie uma edição nas configurações para administrar esta área.
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      {creating ? (
        <form
          onSubmit={createEvent}
          className="space-y-6 rounded-xl bg-white/10 p-6"
        >
          <div>
            <h1 className="text-3xl font-bold">
              {selected ? "Criar próxima edição" : "Criar primeira edição"}
            </h1>
            <p className="mt-1 text-sm text-gray-300">
              {selected
                ? `A edição ${selected.year} serve como modelo para agenda e fuso horário. As categorias padrão serão criadas; participantes, fotos, votos e resultados não serão copiados.`
                : "Defina o cronograma. As categorias padrão serão criadas automaticamente."}
            </p>
          </div>
          <EventForm
            value={draft}
            setValue={setDraft}
            disabled={busy}
            yearDisabled={false}
            collisions={collisions}
            onDateChange={updateEventDate}
          />
          <section className="space-y-3 rounded-xl border border-white/20 p-4">
            <div>
              <h2 className="text-xl font-semibold">Categorias padrão</h2>
              <p className="text-sm text-gray-300">
                Estas categorias serão criadas nesta edição e poderão ser
                revisadas ou editadas nas configurações após a criação.
              </p>
            </div>
            <ol className="grid gap-2">
              {DEFAULT_EVENT_CATEGORIES.map((category) => (
                <li key={category.order}>
                  {category.icon} {category.title}
                </li>
              ))}
            </ol>
          </section>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setCreating(false);
                setDraft(selected ? eventForm(selected) : null);
              }}
              className="rounded-lg bg-gray-700 px-4 py-2"
            >
              Cancelar
            </button>
            <button
              disabled={busy || collisions.length > 0}
              className="rounded-lg bg-orange-500 px-4 py-2 font-bold text-black disabled:opacity-50"
            >
              {busy ? "Criando..." : "Criar evento"}
            </button>
          </div>
        </form>
      ) : selected && initialTab === "settings" ? (
        <form
          onSubmit={saveEvent}
          className="space-y-6 rounded-xl bg-white/10 p-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-3xl font-bold">
              Configurações de {selected.year}
            </h1>
            <button
              type="button"
              onClick={openCreate}
              className="min-h-11 rounded-lg bg-orange-500 px-4 py-2 font-semibold text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300"
            >
              Criar próxima edição
            </button>
          </div>
          <EventForm
            value={draft}
            setValue={setDraft}
            disabled={busy}
            yearDisabled
            collisions={collisions}
            onDateChange={updateEventDate}
          />
          <div className="space-y-4 rounded-2xl border border-white/10 bg-black/20 p-4 sm:p-5">
            <div>
              <h2 className="text-xl font-semibold">Opções avançadas</h2>
              <p className="mt-1 text-sm text-gray-300">
                Lifecycle, categorias e publicação continuam protegidos pelas
                regras desta edição.
              </p>
            </div>
            <section
              id="categorias"
              className="scroll-mt-24 space-y-4 rounded-xl border border-white/20 p-4"
            >
              <div>
                <h2 className="text-xl font-semibold">Categorias</h2>
                <p className="text-sm text-gray-300">
                  {selected.votingStatus === "not_started"
                    ? "Edite as categorias desta edição. Elas serão bloqueadas quando a votação começar."
                    : "As categorias estão bloqueadas porque a votação já foi iniciada."}
                </p>
              </div>
              {categoriesLoading ? (
                <p role="status">Carregando categorias…</p>
              ) : (
                <>
                  {categoryDraft.map((category, index) => (
                    <div
                      key={category._id ?? `new-${index}`}
                      className="grid gap-3 rounded-lg border border-white/10 p-3 md:grid-cols-[1fr_7rem_1fr_auto]"
                    >
                      <label className="grid gap-1 text-sm">
                        Nome
                        <input
                          required
                          minLength={2}
                          maxLength={80}
                          disabled={
                            selected.votingStatus !== "not_started" ||
                            savingCategories
                          }
                          value={category.title}
                          onChange={(event) =>
                            updateCategory(index, { title: event.target.value })
                          }
                          className="rounded border border-white/20 bg-white/10 px-3 py-2 disabled:opacity-60"
                        />
                      </label>
                      <label className="grid gap-1 text-sm">
                        Ícone
                        <input
                          maxLength={16}
                          disabled={
                            selected.votingStatus !== "not_started" ||
                            savingCategories
                          }
                          value={category.icon}
                          onChange={(event) =>
                            updateCategory(index, { icon: event.target.value })
                          }
                          className="rounded border border-white/20 bg-white/10 px-3 py-2 disabled:opacity-60"
                        />
                      </label>
                      <label className="grid gap-1 text-sm">
                        Elegibilidade
                        <select
                          disabled={
                            selected.votingStatus !== "not_started" ||
                            savingCategories
                          }
                          value={category.eligibility}
                          onChange={(event) =>
                            updateCategory(index, {
                              eligibility: event.target
                                .value as EventCategoryInput["eligibility"],
                            })
                          }
                          className="rounded border border-white/20 bg-black px-3 py-2 disabled:opacity-60"
                        >
                          <option value="all">Todas</option>
                          <option value="group">Grupos</option>
                          <option value="junior">Infantil</option>
                        </select>
                      </label>
                      <div className="flex items-end gap-2">
                        <button
                          type="button"
                          aria-label={`Mover ${category.title || `categoria ${index + 1}`} para cima`}
                          disabled={
                            selected.votingStatus !== "not_started" ||
                            savingCategories ||
                            index === 0
                          }
                          onClick={() => moveCategory(index, -1)}
                          className="rounded bg-gray-700 px-3 py-2 disabled:opacity-50"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          aria-label={`Mover ${category.title || `categoria ${index + 1}`} para baixo`}
                          disabled={
                            selected.votingStatus !== "not_started" ||
                            savingCategories ||
                            index === categoryDraft.length - 1
                          }
                          onClick={() => moveCategory(index, 1)}
                          className="rounded bg-gray-700 px-3 py-2 disabled:opacity-50"
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          disabled={
                            selected.votingStatus !== "not_started" ||
                            savingCategories ||
                            categoryDraft.length === 1
                          }
                          onClick={() =>
                            setCategoryDraft((current) =>
                              current
                                .filter((_, itemIndex) => itemIndex !== index)
                                .map((item, order) => ({ ...item, order })),
                            )
                          }
                          className="rounded bg-gray-700 px-3 py-2 disabled:opacity-50"
                        >
                          Remover
                        </button>
                      </div>
                    </div>
                  ))}
                  {categoryError && (
                    <p role="alert" className="text-sm text-red-400">
                      {categoryError}
                    </p>
                  )}
                  {categoryError && !categoriesReady && (
                    <button
                      type="button"
                      disabled={categoriesLoading}
                      onClick={() => void loadCategories(selected._id)}
                      className="rounded border border-white/30 px-3 py-2 disabled:opacity-50"
                    >
                      Tentar carregar novamente
                    </button>
                  )}
                  {selected.votingStatus === "not_started" && (
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        disabled={
                          savingCategories || categoryDraft.length >= 30
                        }
                        onClick={() =>
                          setCategoryDraft((current) => [
                            ...current,
                            {
                              title: "",
                              icon: "",
                              order: current.length,
                              eligibility: "all",
                            },
                          ])
                        }
                        className="rounded border border-white/30 px-3 py-2 disabled:opacity-50"
                      >
                        Adicionar categoria
                      </button>
                      <button
                        type="button"
                        disabled={
                          savingCategories ||
                          categoriesLoading ||
                          !categoriesReady
                        }
                        onClick={saveCategories}
                        className="rounded-lg bg-orange-500 px-4 py-2 font-semibold text-black disabled:opacity-50"
                      >
                        {savingCategories ? "Salvando…" : "Salvar categorias"}
                      </button>
                    </div>
                  )}
                </>
              )}
            </section>
            <section className="space-y-3 rounded-xl border border-white/20 p-4">
              <div>
                <h2 className="text-xl font-semibold">
                  Confirmações de presença (RSVP)
                </h2>
                <p className="text-sm text-gray-300">
                  {enrollmentControls?.rsvpState === "upcoming"
                    ? `Abrem em ${formatEventDate(selected.registrationStartsAt, selected.timezone)} (${selected.timezone}).`
                    : enrollmentControls?.rsvpState === "open"
                      ? "As confirmações de presença estão abertas até a primeira abertura da votação."
                      : selected.status !== "active"
                        ? "Esta edição está arquivada e não aceita novas confirmações de presença."
                        : "Novas confirmações de presença foram encerradas permanentemente quando a votação começou."}
                </p>
                <p className="text-sm text-gray-300">
                  A disponibilidade de RSVP é independente das inscrições do
                  concurso. Fechar as inscrições do concurso mantém as
                  confirmações de presença abertas.
                </p>
              </div>
              <span
                aria-label={`Status das confirmações de presença: ${
                  enrollmentControls?.rsvpState === "upcoming"
                    ? "agendadas"
                    : enrollmentControls?.rsvpState === "open"
                      ? "abertas"
                      : "encerradas"
                }`}
                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                  enrollmentControls?.rsvpState === "open"
                    ? "bg-green-700 text-green-100"
                    : "bg-gray-700 text-gray-200"
                }`}
                role="status"
              >
                {enrollmentControls?.rsvpState === "upcoming"
                  ? "RSVP agendado"
                  : enrollmentControls?.rsvpState === "open"
                    ? "RSVP aberto"
                    : "RSVP encerrado"}
              </span>
            </section>
            <section className="space-y-3 rounded-xl border border-white/20 p-4">
              <div>
                <h2 className="text-xl font-semibold">
                  Inscrições do concurso
                </h2>
                <p className="text-sm text-gray-300">
                  {contestEntryState === "upcoming"
                    ? "As inscrições abrem no horário programado para esta edição."
                    : contestEntryState === "open"
                      ? "As inscrições do concurso estão abertas."
                      : "As inscrições do concurso estão fechadas."}
                </p>
                <p className="text-sm text-gray-300">
                  Fechar as inscrições não impede novas confirmações de
                  presença.
                </p>
                <p className="text-sm text-gray-300">
                  Inscrições completas com foto autorizada são congeladas. Os
                  rascunhos incompletos continuam privados; antes da votação, é
                  possível reabrir as inscrições.
                </p>
              </div>
              <span
                aria-label={`Status das inscrições do concurso: ${
                  contestEntryState === "upcoming"
                    ? "agendadas"
                    : contestEntryState === "open"
                      ? "abertas"
                      : "encerradas"
                }`}
                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                  contestEntryState === "open"
                    ? "bg-green-700 text-green-100"
                    : "bg-gray-700 text-gray-200"
                }`}
                role="status"
              >
                {contestEntryState === "upcoming"
                  ? "Inscrições do concurso agendadas"
                  : contestEntryState === "open"
                    ? "Inscrições do concurso abertas"
                    : "Inscrições do concurso fechadas"}
              </span>
              <button
                type="button"
                disabled={
                  busy ||
                  selected.status !== "active" ||
                  selected.votingStatus !== "not_started"
                }
                onClick={() =>
                  changeLifecycle(
                    selected.contestEntryStatus === "closed"
                      ? "reopen-contest-entry"
                      : "close-contest-entry",
                  )
                }
                className="rounded-lg bg-orange-500 px-4 py-2 font-semibold text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300 disabled:opacity-50"
              >
                {selected.contestEntryStatus === "closed"
                  ? "Reabrir inscrições"
                  : "Fechar inscrições"}
              </button>
              {selected.votingStatus !== "not_started" && (
                <p className="text-xs text-gray-300">
                  As inscrições não podem ser alteradas após o início da
                  votação.
                </p>
              )}
              {selected.status !== "active" && (
                <p className="text-xs text-gray-300">
                  Ative esta edição para alterar as inscrições do concurso.
                </p>
              )}
            </section>
            <section className="grid gap-4 rounded-xl border border-white/20 p-4 md:grid-cols-2">
              <div className="space-y-3">
                <div>
                  <h2 className="text-xl font-semibold">Votação</h2>
                  <p className="text-sm text-gray-300">
                    {selected.votingStatus === "open"
                      ? "A votação está aberta."
                      : selected.votingStatus === "ended"
                        ? "A votação foi encerrada."
                        : "A votação ainda não foi iniciada."}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={
                    busy ||
                    selected.status !== "active" ||
                    (selected.votingStatus !== "open" &&
                      (!eventHasStarted ||
                        selected.contestEntryStatus !== "closed"))
                  }
                  onClick={() =>
                    changeLifecycle(
                      selected.votingStatus === "open"
                        ? "end-voting"
                        : "start-voting",
                    )
                  }
                  className="rounded-lg bg-orange-500 px-4 py-2 font-semibold text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300 disabled:opacity-50"
                >
                  {selected.votingStatus === "open"
                    ? "Encerrar votação"
                    : selected.votingStatus === "ended"
                      ? "Reabrir votação"
                      : "Iniciar votação"}
                </button>
                {selected.status !== "active" && (
                  <p className="text-xs text-gray-300">
                    Ative o evento para controlar a votação.
                  </p>
                )}
                {selected.status === "active" &&
                  selected.votingStatus !== "open" &&
                  !eventHasStarted && (
                    <p className="text-xs text-gray-300">
                      A votação só pode começar após o início do evento.
                    </p>
                  )}
                {selected.status === "active" &&
                  selected.votingStatus !== "open" &&
                  eventHasStarted &&
                  selected.contestEntryStatus !== "closed" && (
                    <p className="text-xs text-gray-300">
                      Feche as inscrições do concurso antes de iniciar a
                      votação.
                    </p>
                  )}
              </div>
              <div className="space-y-3">
                <div>
                  <h2 className="text-xl font-semibold">Resultados</h2>
                  <p className="text-sm text-gray-300">
                    {selected.resultsPublished
                      ? "Os resultados estão publicados."
                      : "Os resultados estão ocultos."}
                  </p>
                </div>
                <button
                  type="button"
                  aria-describedby={
                    !selected.resultsPublished &&
                    selected.votingStatus !== "ended"
                      ? "results-publication-disabled-reason"
                      : undefined
                  }
                  disabled={
                    busy ||
                    (!selected.resultsPublished &&
                      selected.votingStatus !== "ended")
                  }
                  onClick={() =>
                    changeLifecycle(
                      selected.resultsPublished
                        ? "unpublish-results"
                        : "publish-results",
                    )
                  }
                  className="rounded-lg bg-green-600 px-4 py-2 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-300 disabled:opacity-50"
                >
                  {selected.resultsPublished
                    ? "Ocultar resultados"
                    : "Publicar resultados"}
                </button>
                {!selected.resultsPublished &&
                  selected.votingStatus !== "ended" && (
                    <p
                      id="results-publication-disabled-reason"
                      className="text-xs text-gray-300"
                    >
                      Encerre a votação antes de publicar os resultados.
                    </p>
                  )}
              </div>
            </section>
          </div>
          <section className="space-y-3 rounded-xl border border-red-400/30 bg-red-950/15 p-4">
            <div>
              <h2 className="text-xl font-semibold">Zona de perigo</h2>
              <p className="text-sm text-gray-300">
                {selected.status === "active"
                  ? "Arquivar encerra a edição ativa e impede novas confirmações de presença. Os dados históricos são preservados."
                  : "Ativar esta edição arquiva a edição ativa atual. Os dados históricos são preservados."}
              </p>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                changeStatus(
                  selected.status === "active" ? "archive" : "activate",
                )
              }
              className="rounded-lg border border-red-300/40 bg-red-950/50 px-4 py-2 font-semibold text-red-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-300 disabled:opacity-50"
            >
              {selected.status === "active"
                ? "Arquivar edição"
                : "Ativar edição"}
            </button>
          </section>
          <div className="flex justify-end gap-3">
            <button
              disabled={busy || collisions.length > 0}
              className="rounded-lg bg-blue-600 px-4 py-2 font-semibold disabled:opacity-50"
            >
              {busy ? "Salvando..." : "Salvar alterações"}
            </button>
          </div>
        </form>
      ) : selected && initialTab === "results" ? (
        <AdminResults key={selected._id} eventId={selected._id} />
      ) : selected && initialTab === "photos" ? (
        <AdminPartyAlbum key={selected._id} eventId={selected._id} />
      ) : null}
    </div>
  );
}
