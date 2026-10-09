import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getGuestRegistration: vi.fn(),
  getCurrentEvent: vi.fn(),
  getCategoryById: vi.fn(),
  getVotingCandidatesForCategory: vi.fn(),
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
vi.mock("@/lib/contestant-entries", () => ({
  getVotingCandidatesForCategory: mocks.getVotingCandidatesForCategory,
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
    expect(mocks.getVotingCandidatesForCategory).not.toHaveBeenCalled();
  });

  it("returns only server-shaped candidates when voting is open", async () => {
    const eventId = "507f1f77bcf86cd799439011";
    const categoryId = "507f1f77bcf86cd799439013";
    mocks.getGuestRegistration.mockResolvedValue({
      userId: "507f1f77bcf86cd799439012",
      eventId,
      fullName: "Guest",
    });
    mocks.getCurrentEvent.mockResolvedValue({
      _id: eventId,
      votingStatus: "open",
      status: "active",
    });
    mocks.isVotingOpen.mockReturnValue(true);
    mocks.getCategoryById.mockResolvedValue({
      _id: categoryId,
      eventId,
      title: "Fantasia",
      icon: "🎃",
      order: 1,
      eligibility: "all",
    });
    mocks.getVotingCandidatesForCategory.mockResolvedValue([
      {
        _id: "507f1f77bcf86cd799439015",
        eventId,
        fullName: "Ana",
        imageUrl: "https://private.example/short-lived-preview",
      },
    ]);

    const response = await GET(
      new Request(`http://localhost/api/candidates?categoryId=${categoryId}`),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual([
      {
        _id: "507f1f77bcf86cd799439015",
        eventId,
        fullName: "Ana",
        imageUrl: "https://private.example/short-lived-preview",
      },
    ]);
    expect(mocks.getVotingCandidatesForCategory).toHaveBeenCalledWith(
      eventId,
      expect.objectContaining({ _id: categoryId }),
      "507f1f77bcf86cd799439012",
    );
  });
});
