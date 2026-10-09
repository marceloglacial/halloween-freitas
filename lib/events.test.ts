import { beforeEach, describe, expect, it, vi } from "vitest";
import { ObjectId } from "mongodb";

const mocks = vi.hoisted(() => ({ getDb: vi.fn(), findOne: vi.fn() }));

vi.mock("@/lib/db", () => ({ getDb: mocks.getDb }));

import {
  getCurrentEvent,
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
  registrationStartsAt: "2026-09-01T04:00:00.000Z",
  eventStartsAt: "2026-11-01T00:00:00.000Z",
  votingStatus: "not_started",
  resultsPublished: false,
  status: "active",
};

describe("event phases", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.getDb.mockResolvedValue({
      collection: () => ({ findOne: mocks.findOne }),
    });
  });

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
      "registration",
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

  it("opens registration inclusively and keeps it open until voting first opens", () => {
    expect(
      getRegistrationState(event, new Date("2026-09-01T03:59:59.999Z")),
    ).toBe("upcoming");
    expect(
      getRegistrationState(event, new Date(event.registrationStartsAt)),
    ).toBe("open");
    expect(getRegistrationState(event, new Date(event.eventStartsAt))).toBe(
      "open",
    );
    expect(getRegistrationState({ ...event, votingStatus: "open" })).toBe(
      "closed",
    );
    expect(getRegistrationState({ ...event, votingStatus: "ended" })).toBe(
      "closed",
    );
  });

  it("keeps archived events closed regardless of their dates", () => {
    expect(
      getRegistrationState(
        { ...event, status: "archived" },
        new Date("2026-09-15T00:00:00Z"),
      ),
    ).toBe("closed");
  });

  it("prefers the active edition for current-event reads", async () => {
    mocks.findOne.mockResolvedValue({
      ...event,
      _id: new ObjectId(),
      registrationStartsAt: new Date(event.registrationStartsAt),
      eventStartsAt: new Date(event.eventStartsAt),
    });

    expect(await getCurrentEvent()).toMatchObject({ slug: event.slug });
    expect(mocks.findOne).toHaveBeenCalledWith(
      { status: "active" },
      { sort: { year: -1, _id: 1 } },
    );
  });

  it("uses the newest year deterministically when no edition is active", async () => {
    mocks.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        ...event,
        _id: new ObjectId(),
        status: "archived",
        registrationStartsAt: new Date(event.registrationStartsAt),
        eventStartsAt: new Date(event.eventStartsAt),
      });

    const fallback = await getCurrentEvent();
    expect(fallback).toMatchObject({
      slug: event.slug,
      status: "archived",
    });
    expect(mocks.findOne).toHaveBeenLastCalledWith(
      {},
      { sort: { year: -1, _id: 1 } },
    );
    expect(
      getRegistrationState(fallback!, new Date("2026-10-01T00:00:00.000Z")),
    ).toBe("closed");
  });

  it("reads legacy schedule fields while existing event data is being migrated", async () => {
    mocks.findOne.mockResolvedValue({
      _id: new ObjectId(),
      year: 2026,
      slug: "halloween-2026",
      title: "Halloween 2026",
      timezone: "America/Toronto",
      startsAt: new Date("2026-11-01T00:00:00.000Z"),
      registrationOpensAt: new Date("2026-09-01T04:00:00.000Z"),
      status: "active",
    });

    expect(await getCurrentEvent()).toMatchObject({
      registrationStartsAt: "2026-09-01T04:00:00.000Z",
      eventStartsAt: "2026-11-01T00:00:00.000Z",
    });
  });
});
