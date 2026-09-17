import { describe, expect, it } from "vitest";
import {
  cascadeScheduleField,
  deriveRegistrationClose,
  eventToLocalSchedule,
  getScheduleFieldBounds,
  parseEventInput,
  shiftEventSchedule,
  withDerivedRegistrationClose,
} from "@/lib/event-schedule";

const event: HalloweenEvent = {
  _id: "507f1f77bcf86cd799439011",
  year: 2024,
  slug: "halloween-2024",
  title: "Halloween 2024",
  timezone: "America/Toronto",
  registrationOpensAt: "2024-08-01T04:00:00.000Z",
  registrationClosesAt: "2024-10-31T23:59:00.000Z",
  startsAt: "2024-11-01T00:00:00.000Z",
  votingStatus: "ended",
  resultsPublished: true,
  status: "archived",
};

describe("event schedule", () => {
  it("formats stored instants in the event timezone", () => {
    expect(eventToLocalSchedule(event).startsAt).toBe("2024-10-31T20:00");
  });

  it("shifts wall-clock values and clamps leap day", () => {
    const leapEvent = {
      ...event,
      registrationOpensAt: "2024-02-29T17:00:00.000Z",
    };
    expect(shiftEventSchedule(leapEvent, 2025).registrationOpensAt).toBe(
      "2025-02-28T12:00",
    );
    expect(shiftEventSchedule(leapEvent, 2025).registrationClosesAt).toBe(
      "2025-10-31T19:59",
    );
  });

  it("derives registration closing across calendar boundaries", () => {
    expect(deriveRegistrationClose("2025-01-01T00:00")).toBe(
      "2024-12-31T23:59",
    );
    expect(deriveRegistrationClose("2024-03-01T00:00")).toBe(
      "2024-02-29T23:59",
    );
  });

  it("normalizes a legacy registration closing from event start", () => {
    const schedule = {
      ...eventToLocalSchedule(event),
      registrationClosesAt: "2024-09-01T00:00",
    };

    expect(withDerivedRegistrationClose(schedule)).toEqual({
      ...schedule,
      registrationClosesAt: "2024-10-31T19:59",
    });
  });

  it("parses valid local dates into UTC dates", () => {
    const result = parseEventInput({
      ...eventToLocalSchedule(event),
      year: 2024,
      title: event.title,
      timezone: event.timezone,
    });
    expect("value" in result && result.value.startsAt.toISOString()).toBe(
      event.startsAt,
    );
  });

  it.each(["2024-10-31T19:58", "2024-10-31T20:00"])(
    "rejects a non-derived registration closing at %s",
    (registrationClosesAt) => {
      const result = parseEventInput({
        ...eventToLocalSchedule(event),
        registrationClosesAt,
        year: 2024,
        title: event.title,
        timezone: event.timezone,
      });

      expect(result).toEqual({
        error:
          "O encerramento das inscrições deve ser exatamente um minuto antes do início do evento",
      });
    },
  );

  it("rejects registration opening at the derived closing minute", () => {
    const schedule = eventToLocalSchedule(event);
    const result = parseEventInput({
      ...schedule,
      registrationOpensAt: schedule.registrationClosesAt,
      year: 2024,
      title: event.title,
      timezone: event.timezone,
    });

    expect(result).toEqual({
      error:
        'Defina "Abertura das inscrições" antes de "Encerramento das inscrições". Sugestão: use 31/10/2024 às 19:58 ou um horário anterior.',
    });
  });

  it("keeps registration opening independent", () => {
    const schedule = eventToLocalSchedule(event);
    expect(
      cascadeScheduleField(schedule, "registrationOpensAt", "2024-08-02T01:00"),
    ).toEqual({ ...schedule, registrationOpensAt: "2024-08-02T01:00" });
  });

  it("derives registration closing when the event start moves", () => {
    const schedule = eventToLocalSchedule(event);
    expect(
      cascadeScheduleField(schedule, "startsAt", "2024-11-01T20:00"),
    ).toEqual({
      registrationOpensAt: "2024-08-01T00:00",
      registrationClosesAt: "2024-11-01T19:59",
      startsAt: "2024-11-01T20:00",
    });
  });

  it("constrains event start by registration opening and selected year", () => {
    const schedule = eventToLocalSchedule(event);
    const bounds = getScheduleFieldBounds(schedule, "startsAt", 2024);

    expect(
      cascadeScheduleField(schedule, "startsAt", bounds.min!)
        .registrationClosesAt,
    ).toBe("2024-08-01T00:01");
    expect(
      cascadeScheduleField(schedule, "startsAt", bounds.max!).startsAt,
    ).toBe("2024-12-31T23:59");
  });

  it("rejects local times skipped by daylight saving time", () => {
    const schedule = eventToLocalSchedule(event);
    const result = parseEventInput({
      ...schedule,
      registrationOpensAt: "2024-03-10T02:30",
      year: 2024,
      title: event.title,
      timezone: event.timezone,
    });
    expect(result).toEqual({ error: "Data do evento inválida" });
  });
});
