import { fromZonedTime, formatInTimeZone } from "date-fns-tz";

export const eventDateFields = [
  "registrationStartsAt",
  "eventStartsAt",
] as const;

export type EventDateField = (typeof eventDateFields)[number];
export type LocalEventSchedule = Record<EventDateField, string>;

export const eventDateLabels: Record<EventDateField, string> = {
  registrationStartsAt: "Abertura das inscrições",
  eventStartsAt: "Início do evento",
};

export type ScheduleCollision = {
  earlierField: EventDateField;
  laterField: EventDateField;
  suggestedLocalValue: string;
};

export type LocalDateTimeBounds = {
  min?: string;
  max?: string;
};

export type EventInput = LocalEventSchedule & {
  year: number;
  title: string;
  timezone: string;
};

export type ParsedEventInput = Omit<EventInput, EventDateField> &
  Record<EventDateField, Date>;

const localDateTimePattern = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;
const localDateTimeFormat = "yyyy-MM-dd'T'HH:mm";

function localDateTimeMilliseconds(value: string) {
  const match = localDateTimePattern.exec(value);
  if (!match) return null;
  const [, year, month, day, hour, minute] = match;
  const milliseconds = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
  );
  return new Date(milliseconds).toISOString().slice(0, 16) === value
    ? milliseconds
    : null;
}

export function isLocalDateTime(value: string) {
  return localDateTimeMilliseconds(value) !== null;
}

function shiftLocalDateTime(value: string, minutes: number) {
  const milliseconds = localDateTimeMilliseconds(value);
  if (milliseconds === null) return "";
  return new Date(milliseconds + minutes * 60_000).toISOString().slice(0, 16);
}

export function cascadeScheduleField(
  schedule: LocalEventSchedule,
  field: EventDateField,
  nextValue: string,
): LocalEventSchedule {
  return { ...schedule, [field]: nextValue };
}

export function getScheduleFieldBounds(
  schedule: LocalEventSchedule,
  field: EventDateField,
  eventYear: number,
): LocalDateTimeBounds {
  if (field === "registrationStartsAt") return {};

  const minimum = shiftLocalDateTime(schedule.registrationStartsAt, 0);
  const hasValidEventYear =
    Number.isInteger(eventYear) && eventYear >= 2000 && eventYear <= 2100;
  return {
    ...(minimum ? { min: minimum } : {}),
    ...(hasValidEventYear ? { max: `${eventYear}-12-31T23:59` } : {}),
  };
}

export function getScheduleCollisions(
  schedule: LocalEventSchedule,
): ScheduleCollision[] {
  const registrationStart = schedule.registrationStartsAt;
  const eventStart = schedule.eventStartsAt;
  if (
    !isLocalDateTime(registrationStart) ||
    !isLocalDateTime(eventStart) ||
    eventStart >= registrationStart
  ) {
    return [];
  }
  return [
    {
      earlierField: "registrationStartsAt",
      laterField: "eventStartsAt",
      suggestedLocalValue: shiftLocalDateTime(registrationStart, 1),
    },
  ];
}

function formatLocalDateTime(value: string) {
  const match = localDateTimePattern.exec(value);
  if (!match) return value;
  const [, year, month, day, hour, minute] = match;
  return `${day}/${month}/${year} às ${hour}:${minute}`;
}

export function scheduleCollisionMessage(collision: ScheduleCollision) {
  return `Defina "${eventDateLabels[collision.laterField]}" depois de "${eventDateLabels[collision.earlierField]}". Sugestão: use ${formatLocalDateTime(collision.suggestedLocalValue)} ou um horário posterior.`;
}

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
      formatInTimeZone(event[field], event.timezone, localDateTimeFormat),
    ]),
  ) as LocalEventSchedule;
}

function shiftLocalDate(value: string, years: number) {
  const match = localDateTimePattern.exec(value);
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

function parseEventDate(
  localValue: string,
  timezone: string,
): { value: Date } | { error: string } {
  const date = fromZonedTime(localValue, timezone);
  if (
    Number.isNaN(date.getTime()) ||
    formatInTimeZone(date, timezone, localDateTimeFormat) !== localValue
  ) {
    return { error: "Data do evento inexistente neste fuso horário" };
  }

  // Detect a second instant with the same wall-clock value during a DST fold.
  for (let minutes = 15; minutes <= 240; minutes += 15) {
    for (const offset of [-minutes, minutes]) {
      if (
        formatInTimeZone(
          new Date(date.getTime() + offset * 60_000),
          timezone,
          localDateTimeFormat,
        ) === localValue
      ) {
        return { error: "Horário ambíguo neste fuso horário" };
      }
    }
  }
  return { value: date };
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
      !localDateTimePattern.test(localValue) ||
      localDateTimeMilliseconds(localValue) === null
    ) {
      return { error: "Preencha todas as datas do evento" };
    }
    const parsed = parseEventDate(localValue, timezone);
    if ("error" in parsed) return { error: parsed.error };
    parsedDates[field] = parsed.value;
  }

  if (
    formatInTimeZone(parsedDates.eventStartsAt, timezone, "yyyy") !==
    String(year)
  ) {
    return { error: "O início do evento deve pertencer ao ano selecionado" };
  }
  if (parsedDates.eventStartsAt < parsedDates.registrationStartsAt) {
    return {
      error: scheduleCollisionMessage({
        earlierField: "registrationStartsAt",
        laterField: "eventStartsAt",
        suggestedLocalValue: shiftLocalDateTime(
          body.registrationStartsAt as string,
          1,
        ),
      }),
    };
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
