import { beforeEach, describe, expect, it, vi } from "vitest";
import { ObjectId } from "mongodb";

const mocks = vi.hoisted(() => ({
  isAdmin: vi.fn(),
  getEventById: vi.fn(),
  getCategories: vi.fn(),
  getOpenVotingRound: vi.fn(),
  getFinalVotingRoundForCategory: vi.fn(),
  getCategoryResults: vi.fn(),
  distinctVoters: vi.fn(),
}));

vi.mock("@/lib/auth/admin", () => ({ isAdmin: mocks.isAdmin }));
vi.mock("@/lib/db", () => ({
  getDb: vi.fn().mockResolvedValue({
    collection: () => ({ distinct: mocks.distinctVoters }),
  }),
}));
vi.mock("@/lib/events", () => ({ getEventById: mocks.getEventById }));
vi.mock("@/util/get-categories", () => ({
  getCategories: mocks.getCategories,
}));
vi.mock("@/lib/results", () => ({
  getCategoryResults: mocks.getCategoryResults,
}));
vi.mock("@/lib/voting-rounds", () => ({
  getOpenVotingRound: mocks.getOpenVotingRound,
  getFinalVotingRoundForCategory: mocks.getFinalVotingRoundForCategory,
  roundIncludesCategory: (
    round: { eventId: ObjectId; categoryIds: ObjectId[] },
    eventId: string,
    categoryId: string,
  ) =>
    round.eventId.toString() === eventId &&
    round.categoryIds.some((id) => id.toString() === categoryId),
}));

import { GET } from "@/app/api/admin/events/[id]/results/route";

const eventId = "507f1f77bcf86cd799439011";
const firstCategoryId = "507f1f77bcf86cd799439012";
const secondCategoryId = "507f1f77bcf86cd799439013";
const openRoundId = new ObjectId("507f1f77bcf86cd799439014");
const finalRoundId = new ObjectId("507f1f77bcf86cd799439015");

function request(id = eventId) {
  return GET(new Request("http://localhost"), {
    params: Promise.resolve({ id }),
  });
}

describe("private admin event results", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isAdmin.mockResolvedValue(true);
    mocks.distinctVoters.mockResolvedValue([
      new ObjectId("507f1f77bcf86cd799439021"),
      new ObjectId("507f1f77bcf86cd799439022"),
    ]);
    mocks.getEventById.mockResolvedValue({
      _id: eventId,
      votingStatus: "open",
      resultsPublished: false,
      participantCount: 2,
    });
    mocks.getCategories.mockResolvedValue([
      { _id: firstCategoryId, title: "Fantasia", icon: "🎃" },
      { _id: secondCategoryId, title: "Dupla", icon: "👯" },
    ]);
    mocks.getOpenVotingRound.mockResolvedValue({
      _id: openRoundId,
      eventId: new ObjectId(eventId),
      type: "runoff",
      status: "open",
      categoryIds: [new ObjectId(firstCategoryId)],
    });
    mocks.getFinalVotingRoundForCategory.mockResolvedValue({
      _id: finalRoundId,
      eventId: new ObjectId(eventId),
      type: "primary",
      status: "ended",
      categoryIds: [new ObjectId(secondCategoryId)],
    });
    mocks.getCategoryResults.mockImplementation(
      async (_event: string, categoryId: string, roundId: string) => ({
        users: [
          {
            _id: "candidate-id",
            fullName: "Ana",
            votes: 2,
            imageUrl: "private",
          },
        ],
        totalVotes: 2,
        source: { categoryId, roundId },
      }),
    );
  });

  it("denies non-admins before reading event results", async () => {
    mocks.isAdmin.mockResolvedValue(false);

    expect((await request()).status).toBe(401);
    expect(mocks.getEventById).not.toHaveBeenCalled();
  });

  it("rejects malformed and missing events", async () => {
    expect((await request("bad-id")).status).toBe(400);
    expect(mocks.getEventById).not.toHaveBeenCalled();
    mocks.getEventById.mockResolvedValue(null);
    expect((await request()).status).toBe(404);
  });

  it("uses the open runoff where scoped and the category's final round otherwise", async () => {
    const response = await request();
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    await expect(response.json()).resolves.toEqual({
      eventId,
      votingStatus: "open",
      resultsPublished: false,
      participantCount: 2,
      categories: [
        {
          categoryId: firstCategoryId,
          title: "Fantasia",
          icon: "🎃",
          roundType: "runoff",
          roundStatus: "open",
          totalVotes: 2,
          users: [{ _id: "candidate-id", fullName: "Ana", votes: 2 }],
        },
        {
          categoryId: secondCategoryId,
          title: "Dupla",
          icon: "👯",
          roundType: "primary",
          roundStatus: "ended",
          totalVotes: 2,
          users: [{ _id: "candidate-id", fullName: "Ana", votes: 2 }],
        },
      ],
    });
    expect(mocks.getCategoryResults).toHaveBeenNthCalledWith(
      1,
      eventId,
      firstCategoryId,
      openRoundId.toString(),
    );
    expect(mocks.getCategoryResults).toHaveBeenNthCalledWith(
      2,
      eventId,
      secondCategoryId,
      finalRoundId.toString(),
    );
    expect(mocks.getCategories).toHaveBeenCalledWith(eventId);
    expect(mocks.getOpenVotingRound).toHaveBeenCalledWith(eventId);
    expect(mocks.getFinalVotingRoundForCategory).toHaveBeenCalledWith(
      eventId,
      secondCategoryId,
    );
    expect(mocks.distinctVoters).toHaveBeenCalledWith("voterRsvpId", {
      eventId: new ObjectId(eventId),
      roundId: { $in: [openRoundId, finalRoundId] },
    });
  });

  it("returns empty categories with no round or ballots and exposes no candidate metadata", async () => {
    mocks.getOpenVotingRound.mockResolvedValue(null);
    mocks.getFinalVotingRoundForCategory.mockResolvedValue(null);
    const response = await request();
    const body = await response.json();
    expect(body.participantCount).toBe(0);
    expect(body.categories).toEqual([
      expect.objectContaining({ totalVotes: 0, users: [], roundType: null }),
      expect.objectContaining({ totalVotes: 0, users: [], roundType: null }),
    ]);
    expect(mocks.getCategoryResults).not.toHaveBeenCalled();
  });
});
