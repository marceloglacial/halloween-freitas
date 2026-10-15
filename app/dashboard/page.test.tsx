import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  isAdmin: vi.fn(),
  getEvents: vi.fn(),
  getOverview: vi.fn(),
  overview: vi.fn(() => "AdminEventOverview"),
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
  denied: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({ auth: mocks.auth }));
vi.mock("@/lib/auth/admin", () => ({ isAdmin: mocks.isAdmin }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/components/dashboard/admin-access-denied", () => ({
  default: mocks.denied,
}));
vi.mock("@/lib/events", () => ({ getEvents: mocks.getEvents }));
vi.mock("@/lib/admin-event-overview", () => ({
  getAdminEventOverview: mocks.getOverview,
}));
vi.mock("@/components/dashboard/admin-event-overview", () => ({
  default: mocks.overview,
}));

import DashboardPage from "@/app/dashboard/page";

describe("admin dashboard overview route", () => {
  it("redirects signed-out visitors to sign in", async () => {
    const redirectToSignIn = vi.fn(() => {
      throw new Error("sign-in redirect");
    });
    mocks.auth.mockResolvedValue({ userId: null, redirectToSignIn });

    await expect(
      DashboardPage({ searchParams: Promise.resolve({}) }),
    ).rejects.toThrow("sign-in redirect");
    expect(mocks.isAdmin).not.toHaveBeenCalled();
  });

  it("blocks signed-in non-admins", async () => {
    mocks.auth.mockResolvedValue({ userId: "guest-user" });
    mocks.isAdmin.mockResolvedValue(false);

    const result = await DashboardPage({ searchParams: Promise.resolve({}) });
    expect(result).toMatchObject({ props: {} });
    expect(result.type).toBe(mocks.denied);
  });

  it("redirects legacy settings links while preserving the selected year", async () => {
    mocks.auth.mockResolvedValue({ userId: "admin-user" });
    mocks.isAdmin.mockResolvedValue(true);

    await expect(
      DashboardPage({
        searchParams: Promise.resolve({ year: "2025", tab: "settings" }),
      }),
    ).rejects.toThrow("redirect:/dashboard/configuracoes?year=2025");
  });

  it("redirects legacy guest links while preserving the selected year", async () => {
    mocks.auth.mockResolvedValue({ userId: "admin-user" });
    mocks.isAdmin.mockResolvedValue(true);

    await expect(
      DashboardPage({
        searchParams: Promise.resolve({ year: "2024", tab: "guests" }),
      }),
    ).rejects.toThrow("redirect:/dashboard/convidados?year=2024");
  });
  it("loads metrics for the selected archived edition", async () => {
    const active = {
      _id: "active-id",
      year: 2026,
      title: "Halloween 2026",
      status: "active",
    };
    const archived = {
      ...active,
      _id: "archived-id",
      year: 2025,
      title: "Halloween 2025",
      status: "archived",
    };
    mocks.auth.mockResolvedValue({ userId: "admin-user" });
    mocks.isAdmin.mockResolvedValue(true);
    mocks.getEvents.mockResolvedValue([active, archived]);
    mocks.getOverview.mockResolvedValue({ confirmedRsvps: 4 });

    const result = await DashboardPage({
      searchParams: Promise.resolve({ year: "2025" }),
    });

    expect(mocks.getOverview).toHaveBeenCalledWith("archived-id");
    expect(result.type).toBe(mocks.overview);
    expect(result.props.event).toBe(archived);
  });

  it("shows a truthful error state when overview metrics fail", async () => {
    const active = {
      _id: "active-id",
      year: 2026,
      title: "Halloween 2026",
      status: "active",
    };
    mocks.auth.mockResolvedValue({ userId: "admin-user" });
    mocks.isAdmin.mockResolvedValue(true);
    mocks.getEvents.mockResolvedValue([active]);
    mocks.getOverview.mockRejectedValue(new Error("database unavailable"));

    const result = await DashboardPage({ searchParams: Promise.resolve({}) });
    expect(result.props.role).toBe("alert");
  });
});
