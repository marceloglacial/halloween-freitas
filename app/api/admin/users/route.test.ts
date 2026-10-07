import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  isAdmin: vi.fn(),
  getEventById: vi.fn(),
  getAdminUsersForEvent: vi.fn(),
  updateOne: vi.fn(),
}));

vi.mock("@/lib/auth/admin", () => ({ isAdmin: mocks.isAdmin }));
vi.mock("@/lib/events", () => ({ getEventById: mocks.getEventById }));
vi.mock("@/lib/db", () => ({
  getDb: async () => ({ collection: () => ({ updateOne: mocks.updateOne }) }),
}));
vi.mock("@/lib/users", () => ({
  getAdminUsersForEvent: mocks.getAdminUsersForEvent,
}));

import { GET, PUT } from "@/app/api/admin/users/route";

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
    expect(mocks.getAdminUsersForEvent).not.toHaveBeenCalled();
  });

  it("loads users only for the selected event", async () => {
    mocks.isAdmin.mockResolvedValue(true);
    mocks.getEventById.mockResolvedValue({ _id: eventId });
    mocks.getAdminUsersForEvent.mockResolvedValue([{ _id: "user" }]);
    const response = await GET(
      new Request(`http://localhost/api/admin/users?eventId=${eventId}`),
    );
    expect(response.status).toBe(200);
    expect(mocks.getEventById).toHaveBeenCalledWith(eventId);
    expect(mocks.getAdminUsersForEvent).toHaveBeenCalledWith(eventId);
  });

  it("preserves Clerk ownership during authorized name/email edits and ignores forged links", async () => {
    mocks.isAdmin.mockResolvedValue(true);
    mocks.getEventById.mockResolvedValue({ _id: eventId });
    mocks.updateOne.mockResolvedValue({ matchedCount: 1 });
    const response = await PUT(
      new Request("http://localhost/api/admin/users", {
        method: "PUT",
        body: JSON.stringify({
          eventId,
          _id: "507f1f77bcf86cd799439012",
          fullName: "Nome escolhido",
          email: "new@example.com",
          clerkUserId: "forged_owner",
        }),
      }),
    );
    expect(response.status).toBe(200);
    const update = mocks.updateOne.mock.calls[0][1];
    expect(update.$set).toMatchObject({
      fullName: "Nome escolhido",
      normalizedEmail: "new@example.com",
    });
    expect(update.$set).not.toHaveProperty("clerkUserId");
    expect(update).not.toHaveProperty("$unset");
  });
});
