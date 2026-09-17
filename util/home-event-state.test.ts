import { describe, expect, it } from "vitest";
import { getHomeEventState } from "@/util/home-event-state";

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

describe("homepage event state", () => {
  it("keeps the registration homepage before the event starts", () => {
    expect(getHomeEventState(event, new Date("2026-10-31T23:59:59.999Z"))).toBe(
      "pre_event",
    );
  });

  it("shows voting soon exactly when the event starts", () => {
    expect(getHomeEventState(event, new Date(event.startsAt))).toBe(
      "voting_soon",
    );
  });

  it("does not expose an inconsistent early-open voting state", () => {
    expect(
      getHomeEventState(
        { ...event, votingStatus: "open" },
        new Date("2026-10-31T23:59:59.999Z"),
      ),
    ).toBe("pre_event");
  });

  it("shows the enabled voting state after an admin opens voting", () => {
    expect(
      getHomeEventState(
        { ...event, votingStatus: "open" },
        new Date(event.startsAt),
      ),
    ).toBe("voting_open");
  });

  it("shows the ended state while results remain private", () => {
    expect(
      getHomeEventState(
        { ...event, votingStatus: "ended" },
        new Date(event.startsAt),
      ),
    ).toBe("voting_ended");
  });

  it("shows post-event links for published or archived events", () => {
    expect(
      getHomeEventState(
        { ...event, votingStatus: "ended", resultsPublished: true },
        new Date(event.startsAt),
      ),
    ).toBe("post_event");
    expect(
      getHomeEventState(
        { ...event, status: "archived" },
        new Date("2026-01-01T00:00:00.000Z"),
      ),
    ).toBe("post_event");
  });
});
