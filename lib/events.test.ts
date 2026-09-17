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
  registrationClosesAt: "2026-10-31T23:59:00.000Z",
  votingStatus: "not_started",
  resultsPublished: false,
  status: "active",
};

describe("event phases", () => {
  it("combines the registration schedule with manual lifecycle states", () => {
    expect(getEventPhase(event, new Date("2026-09-15T00:00:00Z"))).toBe(
      "registration",
    );
    expect(getEventPhase({ ...event, votingStatus: "open" })).toBe("voting");
    expect(getEventPhase({ ...event, votingStatus: "ended" })).toBe(
      "awaiting-results",
    );
    expect(
      getEventPhase({
        ...event,
        votingStatus: "ended",
        resultsPublished: true,
      }),
    ).toBe("results");
  });

  it("does not open voting based on wall-clock time", () => {
    expect(getEventPhase(event, new Date("2026-11-01T07:00:00Z"))).toBe(
      "upcoming",
    );
  });

  it("publishes only explicit results after voting ends", () => {
    expect(resultsArePublic(event)).toBe(false);
    expect(
      resultsArePublic({
        ...event,
        status: "archived",
        votingStatus: "ended",
        resultsPublished: true,
      }),
    ).toBe(true);
    expect(
      resultsArePublic({
        ...event,
        status: "archived",
        resultsPublished: true,
      }),
    ).toBe(false);
  });

  it("opens registration inclusively and closes it exclusively", () => {
    expect(
      getRegistrationState(event, new Date("2026-09-01T03:59:59.999Z")),
    ).toBe("upcoming");
    expect(
      getRegistrationState(event, new Date(event.registrationOpensAt)),
    ).toBe("open");
    expect(
      getRegistrationState(event, new Date("2026-10-31T23:58:59.999Z")),
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
