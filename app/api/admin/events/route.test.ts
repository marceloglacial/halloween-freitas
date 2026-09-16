import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  isAdmin: vi.fn(),
  getEvents: vi.fn(),
}));

vi.mock("@/lib/auth/admin", () => ({ isAdmin: mocks.isAdmin }));
vi.mock("@/lib/events", () => ({
  getEvents: mocks.getEvents,
  getEventById: vi.fn(),
}));
vi.mock("@/lib/db", () => ({
  getDb: vi.fn(),
  getMongoClient: vi.fn(),
}));

import { GET, POST } from "@/app/api/admin/events/route";

describe("admin events API", () => {
  beforeEach(() => vi.resetAllMocks());

  it("rejects event listing for non-admins", async () => {
    mocks.isAdmin.mockResolvedValue(false);
    expect((await GET()).status).toBe(401);
    expect(mocks.getEvents).not.toHaveBeenCalled();
  });

  it("rejects event creation for non-admins before reading input", async () => {
    mocks.isAdmin.mockResolvedValue(false);
    const response = await POST(
      new Request("http://localhost/api/admin/events", {
        method: "POST",
        body: "invalid",
      }),
    );
    expect(response.status).toBe(401);
  });

  it("lists events for admins", async () => {
    mocks.isAdmin.mockResolvedValue(true);
    mocks.getEvents.mockResolvedValue([{ year: 2026 }]);
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([{ year: 2026 }]);
  });
});
