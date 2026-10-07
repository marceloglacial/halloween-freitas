import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  isAdmin: vi.fn(),
  getEventById: vi.fn(),
  updateOne: vi.fn(),
}));
vi.mock("@/lib/auth/admin", () => ({ isAdmin: mocks.isAdmin }));
vi.mock("@/lib/events", () => ({ getEventById: mocks.getEventById }));
vi.mock("@/lib/db", () => ({
  getDb: async () => ({ collection: () => ({ updateOne: mocks.updateOne }) }),
}));
import { POST } from "./route";
const eventId = "507f1f77bcf86cd799439011";
const userId = "507f1f77bcf86cd799439012";
const request = (body: unknown) =>
  new Request("http://localhost/api/admin/users/access-link", {
    method: "POST",
    body: JSON.stringify(body),
  });
describe("host-assisted access reset", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.isAdmin.mockResolvedValue(true);
    mocks.getEventById.mockResolvedValue({ _id: eventId });
  });
  it("denies ordinary Clerk guests", async () => {
    mocks.isAdmin.mockResolvedValue(false);
    expect(
      (
        await POST(
          request({ eventId, userId, expectedClerkUserId: "clerk_ana" }),
        )
      ).status,
    ).toBe(401);
  });
  it("rejects invalid input", async () => {
    expect((await POST(request({ eventId, userId }))).status).toBe(400);
  });
  it("does not clear a link that changed concurrently", async () => {
    mocks.updateOne.mockResolvedValue({ matchedCount: 0 });
    expect(
      (
        await POST(
          request({ eventId, userId, expectedClerkUserId: "clerk_old" }),
        )
      ).status,
    ).toBe(409);
  });
  it("resets only the selected event's expected link", async () => {
    mocks.updateOne.mockResolvedValue({ matchedCount: 1 });
    expect(
      (
        await POST(
          request({ eventId, userId, expectedClerkUserId: "clerk_ana" }),
        )
      ).status,
    ).toBe(204);
    expect(mocks.updateOne.mock.calls[0][0]).toMatchObject({
      clerkUserId: "clerk_ana",
    });
    expect(mocks.updateOne.mock.calls[0][0].eventId.toString()).toBe(eventId);
    expect(mocks.updateOne.mock.calls[0][1]).toEqual({
      $unset: { clerkUserId: "" },
    });
  });
});
