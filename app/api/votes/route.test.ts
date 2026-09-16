import { beforeEach, describe, expect, it, vi } from "vitest";

const { getGuestSession, getCurrentEvent } = vi.hoisted(() => ({
  getGuestSession: vi.fn(),
  getCurrentEvent: vi.fn(),
}));

vi.mock("@/lib/auth/guest-session", () => ({ getGuestSession }));
vi.mock("@/lib/events", () => ({
  getCurrentEvent,
  getEventPhase: () => "voting",
}));
vi.mock("@/lib/db", () => ({ getDb: vi.fn() }));
vi.mock("@/lib/users", () => ({ getUserById: vi.fn() }));
vi.mock("@/util/get-categories", () => ({ getCategoryById: vi.fn() }));

import { POST } from "@/app/api/votes/route";

describe("vote API authorization", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects requests without a signed guest session", async () => {
    getGuestSession.mockResolvedValue(null);
    const response = await POST(
      new Request("http://localhost/api/votes", {
        method: "POST",
        body: JSON.stringify({ categoryId: "x", voteForId: "y" }),
      }),
    );
    expect(response.status).toBe(401);
  });

  it("rejects a session from a different event", async () => {
    getGuestSession.mockResolvedValue({
      userId: "507f1f77bcf86cd799439011",
      eventId: "507f1f77bcf86cd799439012",
      fullName: "Guest",
    });
    getCurrentEvent.mockResolvedValue({
      _id: "507f1f77bcf86cd799439013",
      status: "active",
    });
    const response = await POST(
      new Request("http://localhost/api/votes", {
        method: "POST",
        body: JSON.stringify({
          categoryId: "507f1f77bcf86cd799439014",
          voteForId: "507f1f77bcf86cd799439015",
        }),
      }),
    );
    expect(response.status).toBe(403);
  });
});
