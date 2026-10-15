import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  isAdmin: vi.fn(),
  getEvents: vi.fn(),
  getCategories: vi.fn(),
  dashboard: vi.fn(),
  denied: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({ auth: mocks.auth }));
vi.mock("@/lib/auth/admin", () => ({ isAdmin: mocks.isAdmin }));
vi.mock("@/lib/events", () => ({ getEvents: mocks.getEvents }));
vi.mock("@/util/get-categories", () => ({
  getCategories: mocks.getCategories,
}));
vi.mock("@/components/dashboard/event-dashboard", () => ({
  default: mocks.dashboard,
}));
vi.mock("@/components/dashboard/admin-access-denied", () => ({
  default: mocks.denied,
}));

import AdminEventDashboardPage from "@/components/dashboard/admin-event-dashboard-page";

describe("admin event dashboard route data", () => {
  it("loads categories only for the edition selected by year", async () => {
    const activeEvent = {
      _id: "active-event-id",
      year: 2026,
      slug: "halloween-2026",
      title: "Halloween 2026",
      timezone: "America/Toronto",
      registrationStartsAt: "2026-09-01T00:00:00.000Z",
      eventStartsAt: "2026-10-31T23:00:00.000Z",
      status: "active",
      contestEntryStatus: "open",
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
    const categories = [{ _id: "category-2025", eventId: archivedEvent._id }];
    mocks.auth.mockResolvedValue({ userId: "admin-user" });
    mocks.isAdmin.mockResolvedValue(true);
    mocks.getEvents.mockResolvedValue([activeEvent, archivedEvent]);
    mocks.getCategories.mockResolvedValue(categories);

    const result = await AdminEventDashboardPage({
      searchParams: Promise.resolve({ year: "2025" }),
      initialTab: "guests",
      returnBackUrl: "/dashboard/convidados",
    });

    expect(mocks.getCategories).toHaveBeenCalledWith(archivedEvent._id);
    expect(result).toMatchObject({
      props: {
        embedded: true,
        initialEvents: [activeEvent, archivedEvent],
        initialCategories: categories,
        initialYear: 2025,
        initialTab: "guests",
      },
    });
  });

  it("does not query event data for a non-admin", async () => {
    mocks.auth.mockResolvedValue({ userId: "guest-user" });
    mocks.isAdmin.mockResolvedValue(false);

    const result = await AdminEventDashboardPage({
      searchParams: Promise.resolve({ year: "2025" }),
      initialTab: "settings",
      returnBackUrl: "/dashboard/configuracoes",
    });

    expect(result.type).toBe(mocks.denied);
    expect(mocks.getEvents).not.toHaveBeenCalled();
    expect(mocks.getCategories).not.toHaveBeenCalled();
  });
});
