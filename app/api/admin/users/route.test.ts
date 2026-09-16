import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  isAdmin: vi.fn(),
  getEventById: vi.fn(),
  getUsersForEvent: vi.fn(),
}));

vi.mock("@/lib/auth/admin", () => ({ isAdmin: mocks.isAdmin }));
vi.mock("@/lib/events", () => ({ getEventById: mocks.getEventById }));
vi.mock("@/lib/db", () => ({ getDb: vi.fn() }));
vi.mock("@/lib/users", () => ({
  getUsersForEvent: mocks.getUsersForEvent,
}));

import { GET } from "@/app/api/admin/users/route";

const eventId = "507f1f77bcf86cd799439011";

describe("admin users API", () => {
  beforeEach(() => vi.resetAllMocks());

  it("rejects non-admin requests", async () => {
    mocks.isAdmin.mockResolvedValue(false);
    const response = await GET(
      new Request(`http://localhost/api/admin/users?eventId=${eventId}`),
    );
    expect(response.status).toBe(401);
  });

  it("requires an explicit valid event", async () => {
    mocks.isAdmin.mockResolvedValue(true);
    const response = await GET(new Request("http://localhost/api/admin/users"));
    expect(response.status).toBe(400);
    expect(mocks.getUsersForEvent).not.toHaveBeenCalled();
  });

  it("loads users only for the selected event", async () => {
    mocks.isAdmin.mockResolvedValue(true);
    mocks.getEventById.mockResolvedValue({ _id: eventId });
    mocks.getUsersForEvent.mockResolvedValue([{ _id: "user" }]);
    const response = await GET(
      new Request(`http://localhost/api/admin/users?eventId=${eventId}`),
    );
    expect(response.status).toBe(200);
    expect(mocks.getEventById).toHaveBeenCalledWith(eventId);
    expect(mocks.getUsersForEvent).toHaveBeenCalledWith(eventId);
  });
});
