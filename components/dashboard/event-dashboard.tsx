"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  EventInput,
  eventDateFields,
  eventToLocalSchedule,
  shiftEventSchedule,
} from "@/lib/event-schedule";
import UserList from "./user-list";
import LogoutButton from "@/components/logout-button";

type DashboardTab = "settings" | "guests";

const dateLabels: Record<(typeof eventDateFields)[number], string> = {
  registrationOpensAt: "Abertura das inscrições",
  registrationClosesAt: "Encerramento das inscrições",
  votingOpensAt: "Abertura da votação",
  startsAt: "Início do evento",
  votingClosesAt: "Encerramento da votação",
  resultsPublishedAt: "Publicação dos resultados",
};

function eventForm(event: HalloweenEvent): EventInput {
  return {
    year: event.year,
    title: event.title,
    timezone: event.timezone,
    ...eventToLocalSchedule(event),
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
}: {
  value: EventInput;
  setValue: (value: EventInput) => void;
  disabled: boolean;
  yearDisabled: boolean;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
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
      {eventDateFields.map((field) => (
        <label key={field} className="grid gap-1 text-sm">
          {dateLabels[field]}
          <input
            type="datetime-local"
            required
            disabled={disabled}
            value={value[field]}
            onChange={(event) =>
              setValue({ ...value, [field]: event.target.value })
            }
            className="rounded border border-white/20 bg-white/10 px-3 py-2"
          />
        </label>
      ))}
    </div>
  );
}

export default function EventDashboard({
  initialEvents,
  initialYear,
  initialTab,
}: {
  initialEvents: HalloweenEvent[];
  initialYear?: number;
  initialTab: DashboardTab;
}) {
  const router = useRouter();
  const [events, setEvents] = useState(initialEvents);
  const [year, setYear] = useState(initialYear);
  const [tab, setTab] = useState<DashboardTab>(initialTab);
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const selected = events.find((event) => event.year === year) ?? events[0];
  const [draft, setDraft] = useState<EventInput | null>(
    selected ? eventForm(selected) : null,
  );

  const nextYear = useMemo(
    () =>
      Math.max(
        new Date().getFullYear(),
        Math.max(...events.map((event) => event.year)) + 1,
      ),
    [events],
  );

  function navigate(nextYearValue: number, nextTab: DashboardTab) {
    setYear(nextYearValue);
    setTab(nextTab);
    router.replace(`/dashboard?year=${nextYearValue}&tab=${nextTab}`);
  }

  function selectEvent(nextYearValue: number) {
    const event = events.find((item) => item.year === nextYearValue);
    if (!event) return;
    setCreating(false);
    setDraft(eventForm(event));
    navigate(nextYearValue, tab);
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
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro inesperado");
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus(action: "activate" | "archive") {
    if (!selected) return;
    const message =
      action === "activate"
        ? `Ativar ${selected.year} e arquivar o evento atual?`
        : `Arquivar o evento de ${selected.year}?`;
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
    if (!selected) return;
    setCreating(true);
    setDraft({
      year: nextYear,
      title: `Halloween dos Freitas ${nextYear}`,
      timezone: selected.timezone,
      ...shiftEventSchedule(selected, nextYear),
    });
  }

  async function createEvent(event: FormEvent) {
    event.preventDefault();
    if (!selected || !draft) return;
    setBusy(true);
    try {
      const response = await fetch("/api/admin/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...draft, templateEventId: selected._id }),
      });
      if (!response.ok) throw new Error(await responseError(response));
      const created = (await response.json()) as HalloweenEvent;
      setEvents((current) =>
        [...current, created].sort((a, b) => b.year - a.year),
      );
      setCreating(false);
      setDraft(eventForm(created));
      navigate(created.year, "settings");
      toast.success("Evento criado com as categorias do ano anterior");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro inesperado");
    } finally {
      setBusy(false);
    }
  }

  if (!selected || !draft) {
    return (
      <section className="rounded-xl bg-white/10 p-6">
        <h1 className="text-3xl font-bold">Eventos</h1>
        <p className="mt-3">
          Nenhum evento encontrado. Execute a migração inicial.
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 rounded-xl bg-white/10 p-4 md:flex-row md:items-end md:justify-between">
        <div>
          <label
            htmlFor="event-year"
            className="mb-1 block text-sm text-gray-300"
          >
            Ano do evento
          </label>
          <div className="flex items-center gap-3">
            <select
              id="event-year"
              value={selected.year}
              onChange={(event) => selectEvent(Number(event.target.value))}
              className="rounded-lg border border-white/20 bg-black px-4 py-2 text-lg"
            >
              {events.map((event) => (
                <option key={event._id} value={event.year}>
                  {event.year}
                </option>
              ))}
            </select>
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${selected.status === "active" ? "bg-green-600" : "bg-gray-600"}`}
            >
              {selected.status === "active" ? "Ativo" : "Arquivado"}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={openCreate}
            className="rounded-lg bg-orange-500 px-4 py-2 font-semibold text-black"
          >
            Novo ano
          </button>
          <LogoutButton />
        </div>
      </header>

      <nav
        aria-label="Seções do dashboard"
        className="flex gap-2 border-b border-white/20"
      >
        {(["settings", "guests"] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => navigate(selected.year, item)}
            className={`px-4 py-3 ${tab === item ? "border-b-2 border-orange-400 text-orange-400" : "text-gray-300"}`}
          >
            {item === "settings" ? "Configurações" : "Convidados"}
          </button>
        ))}
      </nav>

      {creating ? (
        <form
          onSubmit={createEvent}
          className="space-y-6 rounded-xl bg-white/10 p-6"
        >
          <div>
            <h1 className="text-3xl font-bold">Criar novo ano</h1>
            <p className="mt-1 text-sm text-gray-300">
              Revise o cronograma. As categorias serão copiadas de{" "}
              {selected.year}.
            </p>
          </div>
          <EventForm
            value={draft}
            setValue={setDraft}
            disabled={busy}
            yearDisabled={false}
          />
          <div className="flex justify-end gap-2">
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
            <button
              disabled={busy}
              className="rounded-lg bg-orange-500 px-4 py-2 font-bold text-black disabled:opacity-50"
            >
              {busy ? "Criando..." : "Criar evento"}
            </button>
          </div>
        </form>
      ) : tab === "settings" ? (
        <form
          onSubmit={saveEvent}
          className="space-y-6 rounded-xl bg-white/10 p-6"
        >
          <h1 className="text-3xl font-bold">
            Configurações de {selected.year}
          </h1>
          <EventForm
            value={draft}
            setValue={setDraft}
            disabled={busy}
            yearDisabled
          />
          <div className="flex flex-wrap justify-between gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                changeStatus(
                  selected.status === "active" ? "archive" : "activate",
                )
              }
              className="rounded-lg bg-gray-700 px-4 py-2 disabled:opacity-50"
            >
              {selected.status === "active"
                ? "Arquivar evento"
                : "Ativar evento"}
            </button>
            <button
              disabled={busy}
              className="rounded-lg bg-blue-600 px-4 py-2 font-semibold disabled:opacity-50"
            >
              {busy ? "Salvando..." : "Salvar alterações"}
            </button>
          </div>
        </form>
      ) : (
        <UserList key={selected._id} event={selected} />
      )}
    </div>
  );
}
