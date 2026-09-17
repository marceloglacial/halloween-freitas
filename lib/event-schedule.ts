import { fromZonedTime, formatInTimeZone } from "date-fns-tz";

export const eventDateFields = [
  "registrationOpensAt",
  "registrationClosesAt",
  "startsAt",
] as const;

export type EventDateField = (typeof eventDateFields)[number];
export type LocalEventSchedule = Record<EventDateField, string>;

export const eventDateLabels: Record<EventDateField, string> = {
  registrationOpensAt: "Abertura das inscrições",
  registrationClosesAt: "Encerramento das inscrições",
  startsAt: "Início do evento",
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

export function deriveRegistrationClose(startsAt: string) {
  return shiftLocalDateTime(startsAt, -1);
}

export function withDerivedRegistrationClose(
  schedule: LocalEventSchedule,
): LocalEventSchedule {
  return {
    ...schedule,
    registrationClosesAt: deriveRegistrationClose(schedule.startsAt),
  };
}

function localMinuteDifference(laterValue: string, earlierValue: string) {
  const later = localDateTimeMilliseconds(laterValue);
  const earlier = localDateTimeMilliseconds(earlierValue);
  return later === null || earlier === null ? null : (later - earlier) / 60_000;
}

const scheduleCascadeFields: Record<EventDateField, readonly EventDateField[]> =
  {
    registrationOpensAt: ["registrationOpensAt"],
    registrationClosesAt: ["registrationClosesAt"],
    startsAt: eventDateFields.slice(1),
  };

export function getScheduleCascadeFields(field: EventDateField) {
  return scheduleCascadeFields[field];
}

export function cascadeScheduleField(
  schedule: LocalEventSchedule,
  field: EventDateField,
  nextValue: string,
  previousValue = schedule[field],
): LocalEventSchedule {
  const minuteDelta = localMinuteDifference(nextValue, previousValue);
  if (minuteDelta === null) {
    return field === "startsAt"
      ? {
          ...schedule,
          startsAt: nextValue,
          registrationClosesAt: deriveRegistrationClose(nextValue),
        }
      : { ...schedule, [field]: nextValue };
  }

  const cascadedFields = new Set(getScheduleCascadeFields(field));
  return Object.fromEntries(
    eventDateFields.map((scheduleField) => [
      scheduleField,
      scheduleField === field
        ? nextValue
        : field === "startsAt" && scheduleField === "registrationClosesAt"
          ? deriveRegistrationClose(nextValue)
          : cascadedFields.has(scheduleField)
            ? shiftLocalDateTime(schedule[scheduleField], minuteDelta) ||
              schedule[scheduleField]
            : schedule[scheduleField],
    ]),
  ) as LocalEventSchedule;
}

export function getScheduleFieldBounds(
  schedule: LocalEventSchedule,
  field: EventDateField,
  eventYear: number,
): LocalDateTimeBounds {
  const bounds: LocalDateTimeBounds = {};
  if (field === "registrationClosesAt") {
    const derivedValue = deriveRegistrationClose(schedule.startsAt);
    return derivedValue ? { min: derivedValue, max: derivedValue } : bounds;
  }
  const hasValidEventYear =
    Number.isInteger(eventYear) && eventYear >= 2000 && eventYear <= 2100;
  const cascadedFields = new Set(getScheduleCascadeFields(field));
  let minimumDelta: number | null = null;
  let maximumDelta: number | null = null;

  for (let index = 1; index < eventDateFields.length; index += 1) {
    const earlierField = eventDateFields[index - 1];
    const laterField = eventDateFields[index];
    const earlierMoves = cascadedFields.has(earlierField);
    const laterMoves = cascadedFields.has(laterField);
    if (earlierMoves === laterMoves) continue;

    const earlier = localDateTimeMilliseconds(schedule[earlierField]);
    const later = localDateTimeMilliseconds(schedule[laterField]);
    if (earlier === null || later === null) continue;

    if (laterMoves) {
      const delta = (earlier + 60_000 - later) / 60_000;
      minimumDelta =
        minimumDelta === null ? delta : Math.max(minimumDelta, delta);
    } else {
      const delta = (later - 60_000 - earlier) / 60_000;
      maximumDelta =
        maximumDelta === null ? delta : Math.min(maximumDelta, delta);
    }
  }

  if (cascadedFields.has("startsAt") && hasValidEventYear) {
    const yearMinimumDelta = localMinuteDifference(
      `${eventYear}-01-01T00:00`,
      schedule.startsAt,
    );
    const yearMaximumDelta = localMinuteDifference(
      `${eventYear}-12-31T23:59`,
      schedule.startsAt,
    );
    if (yearMinimumDelta !== null) {
      minimumDelta =
        minimumDelta === null
          ? yearMinimumDelta
          : Math.max(minimumDelta, yearMinimumDelta);
    }
    if (yearMaximumDelta !== null) {
      maximumDelta =
        maximumDelta === null
          ? yearMaximumDelta
          : Math.min(maximumDelta, yearMaximumDelta);
    }
  }

  if (minimumDelta !== null) {
    const minimum = shiftLocalDateTime(schedule[field], minimumDelta);
    if (minimum) bounds.min = minimum;
  }
  if (maximumDelta !== null) {
    const maximum = shiftLocalDateTime(schedule[field], maximumDelta);
    if (maximum) bounds.max = maximum;
  }

  return bounds;
}

export function getScheduleCollisions(
  schedule: LocalEventSchedule,
): ScheduleCollision[] {
  const collisions: ScheduleCollision[] = [];
  for (let index = 1; index < eventDateFields.length; index += 1) {
    const earlierField = eventDateFields[index - 1];
    const laterField = eventDateFields[index];
    const earlierValue = schedule[earlierField];
    const laterValue = schedule[laterField];
    if (
      isLocalDateTime(earlierValue) &&
      isLocalDateTime(laterValue) &&
      laterValue <= earlierValue
    ) {
      collisions.push({
        earlierField,
        laterField,
        suggestedLocalValue:
          laterField === "registrationClosesAt"
            ? shiftLocalDateTime(laterValue, -1)
            : shiftLocalDateTime(earlierValue, 1),
      });
    }
  }
  return collisions;
}

function formatLocalDateTime(value: string) {
  const match = localDateTimePattern.exec(value);
  if (!match) return value;
  const [, year, month, day, hour, minute] = match;
  return `${day}/${month}/${year} às ${hour}:${minute}`;
}

export function scheduleCollisionMessage(collision: ScheduleCollision) {
  if (collision.laterField === "registrationClosesAt") {
    return `Defina "${eventDateLabels[collision.earlierField]}" antes de "${eventDateLabels[collision.laterField]}". Sugestão: use ${formatLocalDateTime(collision.suggestedLocalValue)} ou um horário anterior.`;
  }
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
      formatInTimeZone(event[field], event.timezone, "yyyy-MM-dd'T'HH:mm"),
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
  return withDerivedRegistrationClose(
    Object.fromEntries(
      eventDateFields.map((field) => [
        field,
        shiftLocalDate(local[field], yearDelta),
      ]),
    ) as LocalEventSchedule,
  );
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
      !localDateTimePattern.test(localValue)
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
  if (
    body.registrationClosesAt !==
    deriveRegistrationClose(body.startsAt as string)
  ) {
    return {
      error:
        "O encerramento das inscrições deve ser exatamente um minuto antes do início do evento",
    };
  }
  const collision = getScheduleCollisions(
    Object.fromEntries(
      eventDateFields.map((field) => [field, body[field]]),
    ) as LocalEventSchedule,
  )[0];
  if (collision) return { error: scheduleCollisionMessage(collision) };

  return {
    value: {
      year,
      title,
      timezone,
      ...parsedDates,
    },
  };
}
