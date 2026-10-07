import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getGuestRegistration: vi.fn(),
  getCurrentEvent: vi.fn(),
  getCategoryById: vi.fn(),
  getPublicVotingUsersForEvent: vi.fn(),
  isVotingOpen: vi.fn(),
}));

vi.mock("@/lib/auth/guest-registration", async (original) => ({
  ...(await original<object>()),
  getGuestRegistration: mocks.getGuestRegistration,
}));
vi.mock("@/lib/events", () => ({
  getCurrentEvent: mocks.getCurrentEvent,
  isVotingOpen: mocks.isVotingOpen,
}));
vi.mock("@/util/get-categories", () => ({
  getCategoryById: mocks.getCategoryById,
}));
vi.mock("@/lib/users", () => ({
  getPublicVotingUsersForEvent: mocks.getPublicVotingUsersForEvent,
}));

import { GET } from "@/app/api/candidates/route";

describe("candidate API voting lock", () => {
  beforeEach(() => vi.clearAllMocks());

  it("does not expose candidates after voting ends", async () => {
    const eventId = "507f1f77bcf86cd799439011";
    mocks.getGuestRegistration.mockResolvedValue({
      userId: "507f1f77bcf86cd799439012",
      eventId,
      fullName: "Guest",
    });
    mocks.getCurrentEvent.mockResolvedValue({
      _id: eventId,
      votingStatus: "ended",
      status: "active",
    });
    mocks.isVotingOpen.mockReturnValue(false);

    const response = await GET(
      new Request(
        "http://localhost/api/candidates?categoryId=507f1f77bcf86cd799439013",
      ),
    );

    expect(response.status).toBe(403);
    expect(mocks.getCategoryById).not.toHaveBeenCalled();
    expect(mocks.getPublicVotingUsersForEvent).not.toHaveBeenCalled();
  });
});
