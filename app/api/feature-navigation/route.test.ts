import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  getEvents: vi.fn(),
  getRegistrationState: vi.fn(),
  resultsArePublic: vi.fn(),
  getPublishedPartyAlbumEventIds: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ getDb: mocks.getDb }));
vi.mock("@/lib/events", () => ({
  getEvents: mocks.getEvents,
  getRegistrationState: mocks.getRegistrationState,
  resultsArePublic: mocks.resultsArePublic,
}));
vi.mock("@/lib/party-photo-writes", () => ({
  getPublishedPartyAlbumEventIds: mocks.getPublishedPartyAlbumEventIds,
}));

import { GET } from "@/app/api/feature-navigation/route";

const activeEvent: HalloweenEvent = {
  _id: "active-id",
  year: 2026,
  slug: "halloween-2026",
  title: "Halloween dos Freitas",
  timezone: "America/Toronto",
  registrationStartsAt: "2026-09-01T00:00:00.000Z",
  eventStartsAt: "2026-10-31T20:00:00.000Z",
  status: "active",
  contestEntryStatus: "closed",
  votingStatus: "open",
  resultsPublished: false,
};

const archivedEvent: HalloweenEvent = {
  ...activeEvent,
  _id: "archived-id",
  year: 2025,
  slug: "halloween-2025",
  title: "Halloween 2025",
  status: "archived",
  votingStatus: "ended",
  resultsPublished: true,
};

const olderArchivedEvent: HalloweenEvent = {
  ...archivedEvent,
  _id: "older-archived-id",
  year: 2024,
  slug: "halloween-2024",
  title: "Halloween 2024",
};

describe("feature navigation endpoint", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.getDb.mockResolvedValue({});
    mocks.getEvents.mockResolvedValue([
      activeEvent,
      archivedEvent,
      olderArchivedEvent,
    ]);
    mocks.getRegistrationState.mockReturnValue("open");
    mocks.resultsArePublic.mockImplementation(
      (event: HalloweenEvent) =>
        event.votingStatus === "ended" && event.resultsPublished,
    );
    mocks.getPublishedPartyAlbumEventIds.mockResolvedValue(new Set());
  });

  it("returns the authoritative event phase and no album when none is public", async () => {
    const response = await GET();

    await expect(response.json()).resolves.toEqual({
      event: activeEvent,
      phase: "event",
      rsvpAvailable: true,
      resultsAvailable: false,
      partyAlbumEvent: null,
      olderEditionsAvailable: true,
    });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("prefers the active edition when its published album has photos", async () => {
    mocks.getPublishedPartyAlbumEventIds.mockResolvedValue(
      new Set([activeEvent._id, archivedEvent._id]),
    );

    const response = await GET();

    await expect(response.json()).resolves.toMatchObject({
      partyAlbumEvent: {
        slug: activeEvent.slug,
        title: activeEvent.title,
        year: activeEvent.year,
      },
    });
  });

  it("uses the newest published archive when the active edition has no album", async () => {
    mocks.getPublishedPartyAlbumEventIds.mockResolvedValue(
      new Set([archivedEvent._id, olderArchivedEvent._id]),
    );

    const response = await GET();

    await expect(response.json()).resolves.toMatchObject({
      event: activeEvent,
      partyAlbumEvent: {
        slug: archivedEvent.slug,
        title: archivedEvent.title,
        year: archivedEvent.year,
      },
    });
  });

  it("selects the newest archive when there is no active edition", async () => {
    mocks.getEvents.mockResolvedValue([archivedEvent]);
    mocks.getPublishedPartyAlbumEventIds.mockResolvedValue(
      new Set([archivedEvent._id]),
    );

    const response = await GET();

    await expect(response.json()).resolves.toMatchObject({
      event: archivedEvent,
      phase: "post-event",
      rsvpAvailable: false,
      resultsAvailable: true,
      partyAlbumEvent: {
        slug: archivedEvent.slug,
        title: archivedEvent.title,
        year: archivedEvent.year,
      },
    });
  });
});
