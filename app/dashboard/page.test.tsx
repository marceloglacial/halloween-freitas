import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  isAdmin: vi.fn(),
  getEvents: vi.fn(),
  getCategories: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({ auth: mocks.auth }));
vi.mock("@/lib/auth/admin", () => ({ isAdmin: mocks.isAdmin }));
vi.mock("@/lib/events", () => ({ getEvents: mocks.getEvents }));
vi.mock("@/util/get-categories", () => ({
  getCategories: mocks.getCategories,
}));
vi.mock("@/components/feature-unavailable", () => ({
  default: (props: { title: string; message: string }) => ({
    type: "FeatureUnavailable",
    props,
  }),
}));
vi.mock("@/components/dashboard/event-dashboard", () => ({
  default: () => "EventDashboard",
}));

import DashboardPage from "@/app/dashboard/page";

describe("dashboard route authorization", () => {
  it("redirects signed-out visitors to sign in", async () => {
    const redirect = new Error("redirect");
    mocks.auth.mockResolvedValue({
      userId: null,
      redirectToSignIn: vi.fn(() => {
        throw redirect;
      }),
    });

    await expect(
      DashboardPage({ searchParams: Promise.resolve({}) }),
    ).rejects.toBe(redirect);
    expect(mocks.isAdmin).not.toHaveBeenCalled();
  });

  it("blocks signed-in non-admin users before loading private dashboard data", async () => {
    mocks.auth.mockResolvedValue({ userId: "guest-user" });
    mocks.isAdmin.mockResolvedValue(false);

    const result = await DashboardPage({
      searchParams: Promise.resolve({}),
    });

    expect(result).toMatchObject({ props: { title: "Acesso restrito" } });
    expect(mocks.isAdmin).toHaveBeenCalledWith("guest-user");
    expect(mocks.getEvents).not.toHaveBeenCalled();
    expect(mocks.getCategories).not.toHaveBeenCalled();
  });
});
