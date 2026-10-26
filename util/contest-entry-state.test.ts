import { describe, expect, it } from "vitest";
import { getContestEntryState } from "@/util/contest-entry-state";

const event: HalloweenEvent = {
  _id: "507f1f77bcf86cd799439011",
  year: 2026,
  slug: "halloween-2026",
  title: "Halloween 2026",
  timezone: "America/Toronto",
  registrationStartsAt: "2026-09-01T04:00:00.000Z",
  eventStartsAt: "2026-11-01T00:00:00.000Z",
  contestEntryStatus: "open",
  votingStatus: "not_started",
  resultsPublished: false,
  status: "active",
};

describe("contest entry state", () => {
  it("opens inclusively at the scheduled registration start", () => {
    expect(
      getContestEntryState(event, new Date("2026-09-01T03:59:59.999Z")),
    ).toBe("upcoming");
    expect(
      getContestEntryState(event, new Date("2026-09-01T04:00:00.000Z")),
    ).toBe("open");
    expect(
      getContestEntryState(event, new Date("2026-09-01T04:00:00.001Z")),
    ).toBe("open");
  });

  it("closes the shared enrollment window and cannot reopen after voting starts", () => {
    expect(
      getContestEntryState(
        { ...event, contestEntryStatus: "closed" },
        new Date("2026-09-15T00:00:00.000Z"),
      ),
    ).toBe("closed");
    expect(
      getContestEntryState(
        { ...event, votingStatus: "open" },
        new Date("2026-09-15T00:00:00.000Z"),
      ),
    ).toBe("closed");
  });

  it("keeps archived editions closed", () => {
    expect(
      getContestEntryState(
        { ...event, status: "archived" },
        new Date("2026-09-15T00:00:00.000Z"),
      ),
    ).toBe("closed");
  });
});
