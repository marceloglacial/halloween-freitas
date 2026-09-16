import { describe, expect, it } from "vitest";
import {
  eventToLocalSchedule,
  parseEventInput,
  shiftEventSchedule,
} from "@/lib/event-schedule";

const event: HalloweenEvent = {
  _id: "507f1f77bcf86cd799439011",
  year: 2024,
  slug: "halloween-2024",
  title: "Halloween 2024",
  timezone: "America/Toronto",
  registrationOpensAt: "2024-08-01T04:00:00.000Z",
  registrationClosesAt: "2024-10-30T23:00:00.000Z",
  votingOpensAt: "2024-10-31T22:00:00.000Z",
  startsAt: "2024-11-01T00:00:00.000Z",
  votingClosesAt: "2024-11-01T04:00:00.000Z",
  resultsPublishedAt: "2024-11-01T05:00:00.000Z",
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

  it("rejects an invalid schedule order", () => {
    const schedule = eventToLocalSchedule(event);
    const result = parseEventInput({
      ...schedule,
      registrationClosesAt: schedule.registrationOpensAt,
      year: 2024,
      title: event.title,
      timezone: event.timezone,
    });
    expect(result).toEqual({ error: "A ordem das datas do evento é inválida" });
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
