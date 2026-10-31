import { beforeEach, describe, expect, it, vi } from "vitest";
import { ObjectId } from "mongodb";

const mocks = vi.hoisted(() => ({
  isAdmin: vi.fn(),
  getEventById: vi.fn(),
  getCategories: vi.fn(),
  getOpenVotingRound: vi.fn(),
  getCategoryResults: vi.fn(),
  distinctVoters: vi.fn(),
  rounds: vi.fn(),
}));

vi.mock("@/lib/auth/admin", () => ({ isAdmin: mocks.isAdmin }));
vi.mock("@/lib/db", () => ({
  getDb: vi.fn().mockResolvedValue({
    collection: () => ({
      distinct: mocks.distinctVoters,
      find: () => ({ sort: () => ({ toArray: mocks.rounds }) }),
    }),
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
const primaryRound = {
  _id: finalRoundId,
  eventId: new ObjectId(eventId),
  type: "primary" as const,
  status: "ended" as const,
  categoryIds: [new ObjectId(firstCategoryId), new ObjectId(secondCategoryId)],
  openedAt: new Date("2026-10-31T20:00:00.000Z"),
};
const runoffRound = {
  _id: openRoundId,
  eventId: new ObjectId(eventId),
  type: "runoff" as const,
  status: "open" as const,
  categoryIds: [new ObjectId(firstCategoryId)],
  candidateIdsByCategory: [
    {
      categoryId: new ObjectId(firstCategoryId),
      candidateIds: [new ObjectId("507f1f77bcf86cd799439016")],
    },
  ],
  openedAt: new Date("2026-10-31T21:00:00.000Z"),
};
const candidateId = new ObjectId("507f1f77bcf86cd799439016");

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
      ...runoffRound,
    });
    mocks.rounds.mockResolvedValue([primaryRound, runoffRound]);
    mocks.getCategoryResults.mockImplementation(
      async (_event: string, categoryId: string, roundId: string) => ({
        users: [
          {
            _id: candidateId.toString(),
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
          rounds: [
            {
              roundId: finalRoundId.toString(),
              roundType: "primary",
              roundStatus: "ended",
              totalVotes: 2,
              users: [
                { _id: candidateId.toString(), fullName: "Ana", votes: 2 },
              ],
            },
            {
              roundId: openRoundId.toString(),
              roundType: "runoff",
              roundStatus: "open",
              totalVotes: 2,
              users: [
                { _id: candidateId.toString(), fullName: "Ana", votes: 2 },
              ],
            },
          ],
        },
        {
          categoryId: secondCategoryId,
          title: "Dupla",
          icon: "👯",
          rounds: [
            {
              roundId: finalRoundId.toString(),
              roundType: "primary",
              roundStatus: "ended",
              totalVotes: 2,
              users: [
                { _id: candidateId.toString(), fullName: "Ana", votes: 2 },
              ],
            },
          ],
        },
      ],
    });
    expect(mocks.getCategoryResults).toHaveBeenNthCalledWith(
      1,
      eventId,
      firstCategoryId,
      finalRoundId.toString(),
    );
    expect(mocks.getCategoryResults).toHaveBeenNthCalledWith(
      2,
      eventId,
      firstCategoryId,
      openRoundId.toString(),
    );
    expect(mocks.getCategoryResults).toHaveBeenNthCalledWith(
      3,
      eventId,
      secondCategoryId,
      finalRoundId.toString(),
    );
    expect(mocks.getCategories).toHaveBeenCalledWith(eventId);
    expect(mocks.getOpenVotingRound).toHaveBeenCalledWith(eventId);
    expect(mocks.distinctVoters).toHaveBeenCalledWith("voterRsvpId", {
      eventId: new ObjectId(eventId),
      roundId: { $in: [finalRoundId, openRoundId] },
    });
  });

  it("returns empty categories with no round or ballots and exposes no candidate metadata", async () => {
    mocks.getOpenVotingRound.mockResolvedValue(null);
    mocks.rounds.mockResolvedValue([]);
    const response = await request();
    const body = await response.json();
    expect(body.participantCount).toBe(0);
    expect(body.categories).toEqual([
      expect.objectContaining({ rounds: [] }),
      expect.objectContaining({ rounds: [] }),
    ]);
    expect(mocks.getCategoryResults).not.toHaveBeenCalled();
  });
});
