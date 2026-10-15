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
import { DEFAULT_EVENT_CATEGORIES } from "@/lib/event-categories";

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
  initialYear,
  initialNow,
}: {
  initialEvents: HalloweenEvent[];
  initialYear?: number;
  initialNow: string;
}) {
  const router = useRouter();
  const [events, setEvents] = useState(initialEvents);
  const [year, setYear] = useState(initialYear ?? initialEvents[0]?.year);
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(initialEvents.length === 0);
  const selected = events.find((event) => event.year === year) ?? events[0];
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

  function updateEventDate(field: EventDateField, nextValue: string) {
    if (!draft) return;
    setDraft({ ...draft, ...cascadeScheduleField(draft, field, nextValue) });
  }

  function replaceEvent(event: HalloweenEvent) {
    setEvents((current) =>
      current
        .map((item) => (item._id === event._id ? event : item))
        .sort((a, b) => b.year - a.year),
    );
    setDraft(eventForm(event));
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
      replaceEvent((await response.json()) as HalloweenEvent);
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
      setDraft(eventForm(changed));
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

  function openCreate() {
    setCreating(true);
    setDraft(
      selected
        ? {
            year: nextYear,
            title: `Halloween dos Freitas ${nextYear}`,
            timezone: selected.timezone,
            ...shiftEventSchedule(selected, nextYear),
          }
        : newEventForm(nextYear),
    );
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
      setCreating(false);
      setDraft(eventForm(created));
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
        <h1 className="text-3xl font-bold">Configurações</h1>
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

  return (
    <div className="space-y-6">
      <form
        onSubmit={creating ? createEvent : saveEvent}
        className="space-y-6 rounded-xl bg-white/10 p-4 sm:p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">
              {creating
                ? selected
                  ? "Criar próxima edição"
                  : "Criar primeira edição"
                : `Configurações de ${selected?.year}`}
            </h1>
            {creating && (
              <p className="mt-1 max-w-3xl text-sm text-gray-300">
                {selected
                  ? `A edição ${selected.year} serve como modelo para agenda e fuso horário. As categorias padrão serão criadas; participantes, fotos, votos e resultados não serão copiados.`
                  : "Defina o cronograma. As categorias padrão serão criadas automaticamente."}
              </p>
            )}
          </div>
          {!creating && selected && (
            <button
              type="button"
              onClick={openCreate}
              className="min-h-11 rounded-lg bg-orange-500 px-4 py-2 font-semibold text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300"
            >
              Criar próxima edição
            </button>
          )}
        </div>
        <EventForm
          value={draft}
          setValue={setDraft}
          disabled={busy}
          yearDisabled={!creating}
          collisions={collisions}
          onDateChange={updateEventDate}
        />
        {creating && (
          <section className="space-y-3 rounded-xl border border-white/20 p-4">
            <div>
              <h2 className="text-xl font-semibold">Categorias padrão</h2>
              <p className="text-sm text-gray-300">
                Estas categorias serão criadas nesta edição e poderão ser
                revisadas em Concursos após a criação.
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
        )}
        {!creating && selected && (
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
        )}
        <div className="flex justify-end gap-3">
          {creating && selected && (
            <button
              type="button"
              onClick={() => {
                setCreating(false);
                setDraft(eventForm(selected));
              }}
              className="rounded-lg bg-gray-700 px-4 py-2"
            >
              Cancelar
            </button>
          )}
          <button
            disabled={busy || collisions.length > 0}
            className="rounded-lg bg-blue-600 px-4 py-2 font-semibold disabled:opacity-50"
          >
            {busy
              ? creating
                ? "Criando…"
                : "Salvando…"
              : creating
                ? "Criar evento"
                : "Salvar alterações"}
          </button>
        </div>
      </form>
    </div>
  );
}
