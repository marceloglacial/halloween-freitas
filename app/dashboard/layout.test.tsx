import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  isAdmin: vi.fn(),
  getEvents: vi.fn(),
  unavailable: vi.fn(),
  shell: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({ auth: mocks.auth }));
vi.mock("@/lib/auth/admin", () => ({ isAdmin: mocks.isAdmin }));
vi.mock("@/lib/events", () => ({ getEvents: mocks.getEvents }));
vi.mock("@/components/feature-unavailable", () => ({
  default: mocks.unavailable,
}));
vi.mock("@/components/dashboard/admin-dashboard-shell", () => ({
  default: mocks.shell,
}));

import AdminDashboardLayout from "@/app/dashboard/layout";

describe("admin dashboard shared layout authorization", () => {
  it("does not load event data for a signed-in guest", async () => {
    mocks.auth.mockResolvedValue({ userId: "guest-user" });
    mocks.isAdmin.mockResolvedValue(false);

    const result = await AdminDashboardLayout({ children: "private page" });
    expect(result.type).toBe(mocks.unavailable);
    expect(mocks.getEvents).not.toHaveBeenCalled();
  });

  it("passes edition summaries into the shell only after admin authorization", async () => {
    mocks.auth.mockResolvedValue({ userId: "admin-user" });
    mocks.isAdmin.mockResolvedValue(true);
    mocks.getEvents.mockResolvedValue([
      {
        year: 2026,
        title: "Halloween 2026",
        status: "active",
        _id: "private-id-1",
      },
    ]);

    const result = await AdminDashboardLayout({ children: "page" });

    expect(result).toMatchObject({
      props: {
        events: [{ year: 2026, title: "Halloween 2026", status: "active" }],
        children: "page",
      },
    });
    expect(result.type).toBe(mocks.shell);
  });
});
