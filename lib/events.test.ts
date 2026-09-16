import { describe, expect, it } from "vitest";
import {
  getEventPhase,
  getRegistrationState,
  resultsArePublic,
} from "@/lib/events";

const event: HalloweenEvent = {
  _id: "507f1f77bcf86cd799439011",
  year: 2026,
  slug: "halloween-2026",
  title: "Halloween 2026",
  timezone: "America/Toronto",
  startsAt: "2026-11-01T00:00:00.000Z",
  registrationOpensAt: "2026-09-01T04:00:00.000Z",
  registrationClosesAt: "2026-10-15T04:00:00.000Z",
  votingOpensAt: "2026-11-01T00:00:00.000Z",
  votingClosesAt: "2026-11-01T05:00:00.000Z",
  resultsPublishedAt: "2026-11-01T06:00:00.000Z",
  status: "active",
};

describe("event phases", () => {
  it("moves through registration, voting, and results", () => {
    expect(getEventPhase(event, new Date("2026-09-15T00:00:00Z"))).toBe(
      "registration",
    );
    expect(getEventPhase(event, new Date("2026-11-01T01:00:00Z"))).toBe(
      "voting",
    );
    expect(getEventPhase(event, new Date("2026-11-01T07:00:00Z"))).toBe(
      "results",
    );
  });

  it("publishes only completed or archived events", () => {
    const duringRegistration = new Date("2026-09-15T00:00:00Z");
    expect(resultsArePublic(event, duringRegistration)).toBe(false);
    expect(
      resultsArePublic({ ...event, status: "archived" }, duringRegistration),
    ).toBe(true);
  });

  it("opens registration inclusively and closes it exclusively", () => {
    expect(
      getRegistrationState(event, new Date("2026-09-01T03:59:59.999Z")),
    ).toBe("upcoming");
    expect(
      getRegistrationState(event, new Date(event.registrationOpensAt)),
    ).toBe("open");
    expect(
      getRegistrationState(event, new Date("2026-10-15T03:59:59.999Z")),
    ).toBe("open");
    expect(
      getRegistrationState(event, new Date(event.registrationClosesAt)),
    ).toBe("closed");
  });

  it("keeps archived events closed regardless of their dates", () => {
    expect(
      getRegistrationState(
        { ...event, status: "archived" },
        new Date("2026-09-15T00:00:00Z"),
      ),
    ).toBe("closed");
  });
});
