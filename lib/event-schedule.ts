import { fromZonedTime, formatInTimeZone } from "date-fns-tz";

export const eventDateFields = [
  "registrationOpensAt",
  "registrationClosesAt",
  "votingOpensAt",
  "startsAt",
  "votingClosesAt",
  "resultsPublishedAt",
] as const;

export type EventDateField = (typeof eventDateFields)[number];
export type LocalEventSchedule = Record<EventDateField, string>;

export type EventInput = LocalEventSchedule & {
  year: number;
  title: string;
  timezone: string;
};

export type ParsedEventInput = Omit<EventInput, EventDateField> &
  Record<EventDateField, Date>;

export function isValidTimeZone(timezone: string) {
  try {
    new Intl.DateTimeFormat("en", { timeZone: timezone }).format();
    return true;
  } catch {
    return false;
  }
}

export function eventToLocalSchedule(
  event: HalloweenEvent,
): LocalEventSchedule {
  return Object.fromEntries(
    eventDateFields.map((field) => [
      field,
      formatInTimeZone(event[field], event.timezone, "yyyy-MM-dd'T'HH:mm"),
    ]),
  ) as LocalEventSchedule;
}

function shiftLocalDate(value: string, years: number) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return "";
  const [, year, month, day, hour, minute] = match;
  const targetYear = Number(year) + years;
  const lastDay = new Date(Date.UTC(targetYear, Number(month), 0)).getUTCDate();
  return `${targetYear}-${month}-${String(Math.min(Number(day), lastDay)).padStart(2, "0")}T${hour}:${minute}`;
}

export function shiftEventSchedule(event: HalloweenEvent, targetYear: number) {
  const local = eventToLocalSchedule(event);
  const yearDelta = targetYear - event.year;
  return Object.fromEntries(
    eventDateFields.map((field) => [
      field,
      shiftLocalDate(local[field], yearDelta),
    ]),
  ) as LocalEventSchedule;
}

export function parseEventInput(
  value: unknown,
): { value: ParsedEventInput } | { error: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { error: "Dados do evento inválidos" };
  }
  const body = value as Record<string, unknown>;
  const year = Number(body.year);
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const timezone =
    typeof body.timezone === "string" ? body.timezone.trim() : "";
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return { error: "Ano inválido" };
  }
  if (title.length < 2 || title.length > 120) {
    return { error: "Título inválido" };
  }
  if (!isValidTimeZone(timezone)) {
    return { error: "Fuso horário inválido" };
  }

  const parsedDates = {} as Record<EventDateField, Date>;
  for (const field of eventDateFields) {
    const localValue = body[field];
    if (
      typeof localValue !== "string" ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(localValue)
    ) {
      return { error: "Preencha todas as datas do evento" };
    }
    const parsed = fromZonedTime(localValue, timezone);
    if (
      Number.isNaN(parsed.getTime()) ||
      formatInTimeZone(parsed, timezone, "yyyy-MM-dd'T'HH:mm") !== localValue
    ) {
      return { error: "Data do evento inválida" };
    }
    parsedDates[field] = parsed;
  }

  const localStartYear = Number(
    formatInTimeZone(parsedDates.startsAt, timezone, "yyyy"),
  );
  if (localStartYear !== year) {
    return { error: "O início do evento deve pertencer ao ano selecionado" };
  }
  const dates = parsedDates;
  if (!(
    dates.registrationOpensAt < dates.registrationClosesAt &&
    dates.registrationClosesAt <= dates.votingOpensAt &&
    dates.votingOpensAt <= dates.startsAt &&
    dates.startsAt <= dates.votingClosesAt &&
    dates.votingClosesAt <= dates.resultsPublishedAt
  )) {
    return { error: "A ordem das datas do evento é inválida" };
  }

  return {
    value: {
      year,
      title,
      timezone,
      ...parsedDates,
    },
  };
}
