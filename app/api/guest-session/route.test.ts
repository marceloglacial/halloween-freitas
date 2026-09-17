import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createGuestSession: vi.fn(),
  getCurrentEvent: vi.fn(),
  getUserByEmail: vi.fn(),
  isVotingOpen: vi.fn(),
}));

vi.mock("@/lib/auth/guest-session", () => ({
  clearGuestSession: vi.fn(),
  createGuestSession: mocks.createGuestSession,
  getGuestSession: vi.fn(),
}));
vi.mock("@/lib/events", () => ({
  getCurrentEvent: mocks.getCurrentEvent,
  isVotingOpen: mocks.isVotingOpen,
}));
vi.mock("@/lib/users", () => ({ getUserByEmail: mocks.getUserByEmail }));

import { POST } from "@/app/api/guest-session/route";

describe("guest session voting lock", () => {
  beforeEach(() => vi.clearAllMocks());

  it("does not verify an email while voting is closed", async () => {
    mocks.getCurrentEvent.mockResolvedValue({
      _id: "507f1f77bcf86cd799439011",
      votingStatus: "ended",
      status: "active",
    });
    mocks.isVotingOpen.mockReturnValue(false);

    const response = await POST(
      new Request("http://localhost/api/guest-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "guest@example.com" }),
      }),
    );

    expect(response.status).toBe(403);
    expect(mocks.getUserByEmail).not.toHaveBeenCalled();
    expect(mocks.createGuestSession).not.toHaveBeenCalled();
  });
});
