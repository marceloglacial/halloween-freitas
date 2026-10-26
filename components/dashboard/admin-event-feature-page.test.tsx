import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const mocks = vi.hoisted(() => ({
  authorize: vi.fn(),
  getEvents: vi.fn(),
  getEntries: vi.fn(),
  countRsvps: vi.fn(),
  contests: vi.fn(),
  voting: vi.fn(),
  gallery: vi.fn(),
  denied: vi.fn(),
}));

vi.mock("@/lib/auth/admin-page", () => ({
  authorizeAdminPage: mocks.authorize,
}));
vi.mock("@/lib/events", () => ({ getEvents: mocks.getEvents }));
vi.mock("@/lib/contestant-entries", () => ({
  getAdminContestantEntriesForEvent: mocks.getEntries,
}));
vi.mock("@/lib/users", () => ({
  countConfirmedRsvpsForEvent: mocks.countRsvps,
}));
vi.mock("@/components/dashboard/admin-event-contests", () => ({
  default: mocks.contests,
}));
vi.mock("@/components/dashboard/admin-voting", () => ({
  default: mocks.voting,
}));
vi.mock("@/components/dashboard/admin-party-album", () => ({
  default: mocks.gallery,
}));
vi.mock("@/components/dashboard/admin-access-denied", () => ({
  default: mocks.denied,
}));

import AdminEventFeaturePage from "@/components/dashboard/admin-event-feature-page";

const activeEvent = {
  _id: "active-event-id",
  year: 2026,
  slug: "halloween-2026",
  title: "Halloween 2026",
  timezone: "America/Toronto",
  registrationStartsAt: "2026-09-01T00:00:00.000Z",
  eventStartsAt: "2026-10-31T23:00:00.000Z",
  status: "active",
  contestEntryStatus: "closed",
  votingStatus: "not_started",
  resultsPublished: false,
} satisfies HalloweenEvent;

const archivedEvent = {
  ...activeEvent,
  _id: "archived-event-id",
  year: 2025,
  slug: "halloween-2025",
  title: "Halloween 2025",
  status: "archived",
} satisfies HalloweenEvent;

describe("admin event feature route data", () => {
  beforeEach(() => vi.clearAllMocks());

  it("resolves the requested historical edition for each feature module", async () => {
    mocks.authorize.mockResolvedValue(true);
    mocks.getEvents.mockResolvedValue([activeEvent, archivedEvent]);

    const result = await AdminEventFeaturePage({
      searchParams: Promise.resolve({ year: "2025" }),
      feature: "voting",
    });

    expect(mocks.authorize).toHaveBeenCalledWith("/dashboard/votacao");
    expect(result.type).toBe(mocks.voting);
    expect(result.key).toBe(archivedEvent._id);
    expect(result.props.event).toEqual(archivedEvent);
  });

  it("keeps each feature restricted to its selected edition", async () => {
    mocks.authorize.mockResolvedValue(true);
    mocks.getEvents.mockResolvedValue([activeEvent, archivedEvent]);
    mocks.getEntries.mockResolvedValue([]);
    mocks.countRsvps.mockResolvedValue(2);

    const contests = await AdminEventFeaturePage({
      searchParams: Promise.resolve({ year: "2025" }),
      feature: "contests",
    });
    const gallery = await AdminEventFeaturePage({
      searchParams: Promise.resolve({ year: "2026" }),
      feature: "gallery",
    });

    expect(contests.type).toBe(mocks.contests);
    expect(contests.props.event._id).toBe(archivedEvent._id);
    expect(mocks.getEntries).toHaveBeenCalledWith(archivedEvent._id);
    expect(mocks.countRsvps).toHaveBeenCalledWith(archivedEvent._id);
    expect(contests.props.confirmedRsvps).toBe(2);
    expect(gallery.type).toBe(mocks.gallery);
    expect(gallery.props.event._id).toBe(activeEvent._id);
  });

  it("shows setup guidance when there are no editions", async () => {
    mocks.authorize.mockResolvedValue(true);
    mocks.getEvents.mockResolvedValue([]);

    const result = await AdminEventFeaturePage({
      searchParams: Promise.resolve({}),
      feature: "gallery",
    });

    expect(renderToStaticMarkup(result)).toContain("Nenhuma edição disponível");
    expect(renderToStaticMarkup(result)).toContain("Abrir configurações");
    expect(mocks.gallery).not.toHaveBeenCalled();
  });

  it("does not load edition data for an unauthorized request", async () => {
    mocks.authorize.mockResolvedValue(false);

    const result = await AdminEventFeaturePage({
      searchParams: Promise.resolve({ year: "2025" }),
      feature: "contests",
    });

    expect(result.type).toBe(mocks.denied);
    expect(mocks.getEvents).not.toHaveBeenCalled();
  });
});
