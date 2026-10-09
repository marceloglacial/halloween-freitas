import { describe, expect, it } from "vitest";
import {
  cascadeScheduleField,
  eventToLocalSchedule,
  getScheduleFieldBounds,
  getScheduleCollisions,
  parseEventInput,
  shiftEventSchedule,
} from "@/lib/event-schedule";

const event: HalloweenEvent = {
  _id: "507f1f77bcf86cd799439011",
  year: 2024,
  slug: "halloween-2024",
  title: "Halloween 2024",
  timezone: "America/Toronto",
  registrationStartsAt: "2024-08-01T04:00:00.000Z",
  eventStartsAt: "2024-11-01T00:00:00.000Z",
  votingStatus: "not_started",
  resultsPublished: false,
  status: "active",
};

const input = {
  year: 2024,
  title: event.title,
  timezone: event.timezone,
  registrationStartsAt: "2024-08-01T00:00",
  eventStartsAt: "2024-10-31T20:00",
};

describe("event schedule", () => {
  it("formats persisted instants in the event timezone", () => {
    expect(eventToLocalSchedule(event)).toEqual({
      registrationStartsAt: "2024-08-01T00:00",
      eventStartsAt: "2024-10-31T20:00",
    });
  });

  it("shifts local schedule values and clamps leap day", () => {
    const leapEvent = {
      ...event,
      registrationStartsAt: "2024-02-29T17:00:00.000Z",
    };
    expect(shiftEventSchedule(leapEvent, 2025).registrationStartsAt).toBe(
      "2025-02-28T12:00",
    );
    expect(shiftEventSchedule(leapEvent, 2025).eventStartsAt).toBe(
      "2025-10-31T20:00",
    );
  });

  it("parses local schedule input to BSON-compatible instants", () => {
    const result = parseEventInput(input);
    expect("value" in result && result.value.registrationStartsAt).toEqual(
      new Date("2024-08-01T04:00:00.000Z"),
    );
    expect("value" in result && result.value.eventStartsAt).toEqual(
      new Date("2024-11-01T00:00:00.000Z"),
    );
  });

  it("allows the event and registration starts to be equal", () => {
    const result = parseEventInput({
      ...input,
      registrationStartsAt: "2024-10-31T20:00",
    });
    expect("value" in result && result.value.eventStartsAt).toEqual(
      new Date("2024-11-01T00:00:00.000Z"),
    );
  });

  it("requires registration to start before the event when they differ", () => {
    expect(
      parseEventInput({
        ...input,
        registrationStartsAt: "2024-10-31T20:01",
      }),
    ).toEqual({
      error:
        'Defina "Início do evento" depois de "Abertura das inscrições". Sugestão: use 31/10/2024 às 20:02 ou um horário posterior.',
    });
  });

  it("shows a form collision only when the event starts before registration", () => {
    expect(
      getScheduleCollisions({
        registrationStartsAt: "2024-10-31T20:00",
        eventStartsAt: "2024-10-31T20:00",
      }),
    ).toHaveLength(0);
    expect(
      getScheduleCollisions({
        registrationStartsAt: "2024-10-31T20:00",
        eventStartsAt: "2024-10-31T20:01",
      }),
    ).toHaveLength(0);
    expect(
      getScheduleCollisions({
        registrationStartsAt: "2024-10-31T20:01",
        eventStartsAt: "2024-10-31T20:00",
      }),
    ).toHaveLength(1);
  });

  it("bounds the event start at registration and within its edition year", () => {
    expect(
      getScheduleFieldBounds(
        {
          registrationStartsAt: "2024-08-01T00:00",
          eventStartsAt: "2024-10-31T20:00",
        },
        "eventStartsAt",
        2024,
      ),
    ).toEqual({ min: "2024-08-01T00:00", max: "2024-12-31T23:59" });
    expect(
      cascadeScheduleField({ ...input }, "eventStartsAt", "2024-11-01T20:00")
        .eventStartsAt,
    ).toBe("2024-11-01T20:00");
  });

  it("rejects malformed dates and invalid timezones", () => {
    expect(
      parseEventInput({ ...input, eventStartsAt: "2024-02-30T12:00" }),
    ).toEqual({
      error: "Preencha todas as datas do evento",
    });
    expect(parseEventInput({ ...input, timezone: "Mars/Olympus" })).toEqual({
      error: "Fuso horário inválido",
    });
  });

  it("rejects skipped and repeated daylight-saving wall times", () => {
    expect(
      parseEventInput({
        ...input,
        registrationStartsAt: "2024-03-10T02:30",
      }),
    ).toEqual({ error: "Data do evento inexistente neste fuso horário" });
    expect(
      parseEventInput({
        ...input,
        registrationStartsAt: "2024-11-03T01:30",
      }),
    ).toEqual({ error: "Horário ambíguo neste fuso horário" });
  });

  it("parses schedules and rejects daylight-saving gaps and folds in Europe/Berlin", () => {
    const berlinInput = {
      ...input,
      timezone: "Europe/Berlin",
      registrationStartsAt: "2024-08-01T00:00",
      eventStartsAt: "2024-10-31T20:00",
    };
    const valid = parseEventInput(berlinInput);
    expect("value" in valid && valid.value.registrationStartsAt).toEqual(
      new Date("2024-07-31T22:00:00.000Z"),
    );
    expect(
      parseEventInput({
        ...berlinInput,
        registrationStartsAt: "2024-03-31T02:30",
      }),
    ).toEqual({ error: "Data do evento inexistente neste fuso horário" });
    expect(
      parseEventInput({
        ...berlinInput,
        registrationStartsAt: "2024-10-27T02:30",
      }),
    ).toEqual({ error: "Horário ambíguo neste fuso horário" });
  });

  it("requires the event start to belong to the selected edition year", () => {
    expect(
      parseEventInput({
        ...input,
        eventStartsAt: "2025-10-31T20:00",
      }),
    ).toEqual({
      error: "O início do evento deve pertencer ao ano selecionado",
    });
  });
});
