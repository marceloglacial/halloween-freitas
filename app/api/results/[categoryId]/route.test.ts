import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getCategoryById,
  getEventBySlug,
  resultsArePublic,
  getCategoryResults,
  getFinalVotingRoundForCategory,
  getOpenVotingRound,
  roundIncludesCategory,
  isAdmin,
} = vi.hoisted(() => ({
  getCategoryById: vi.fn(),
  getEventBySlug: vi.fn(),
  resultsArePublic: vi.fn().mockReturnValue(false),
  getCategoryResults: vi.fn(),
  getFinalVotingRoundForCategory: vi.fn(),
  getOpenVotingRound: vi.fn(),
  roundIncludesCategory: vi.fn(),
  isAdmin: vi.fn().mockResolvedValue(false),
}));

vi.mock("@/util/get-categories", () => ({ getCategoryById }));
vi.mock("@/lib/events", () => ({
  getEventBySlug,
  resultsArePublic,
}));
vi.mock("@/lib/results", () => ({ getCategoryResults }));
vi.mock("@/lib/voting-rounds", () => ({
  getFinalVotingRoundForCategory,
  getOpenVotingRound,
  roundIncludesCategory,
}));
vi.mock("@/lib/auth/admin", () => ({ isAdmin }));

import { GET } from "@/app/api/results/[categoryId]/route";

describe("results API publication rules", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects malformed category IDs", async () => {
    const response = await GET(new Request("http://localhost/api/results/x"), {
      params: Promise.resolve({ categoryId: "invalid" }),
    });
    expect(response.status).toBe(400);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("does not expose unpublished results", async () => {
    getCategoryById.mockResolvedValue({
      _id: "507f1f77bcf86cd799439011",
      eventId: "507f1f77bcf86cd799439012",
    });
    getEventBySlug.mockResolvedValue({
      _id: "507f1f77bcf86cd799439012",
    });
    const response = await GET(
      new Request("http://localhost/api/results/id?event=halloween-2026"),
      {
        params: Promise.resolve({
          categoryId: "507f1f77bcf86cd799439011",
        }),
      },
    );
    expect(response.status).toBe(403);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("does not expose a category through a different event", async () => {
    getCategoryById.mockResolvedValue({
      _id: "507f1f77bcf86cd799439011",
      eventId: "507f1f77bcf86cd799439099",
    });
    getEventBySlug.mockResolvedValue({ _id: "507f1f77bcf86cd799439012" });
    resultsArePublic.mockReturnValue(true);

    const response = await GET(
      new Request("http://localhost/api/results/id?event=halloween-2026"),
      {
        params: Promise.resolve({
          categoryId: "507f1f77bcf86cd799439011",
        }),
      },
    );

    expect(response.status).toBe(403);
    expect(getFinalVotingRoundForCategory).not.toHaveBeenCalled();
    expect(getCategoryResults).not.toHaveBeenCalled();
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("serves published results without allowing cache storage", async () => {
    getCategoryById.mockResolvedValue({
      _id: "507f1f77bcf86cd799439011",
      eventId: "507f1f77bcf86cd799439012",
    });
    getEventBySlug.mockResolvedValue({ _id: "507f1f77bcf86cd799439012" });
    resultsArePublic.mockReturnValue(true);
    getFinalVotingRoundForCategory.mockResolvedValue({
      _id: "507f1f77bcf86cd799439013",
    });
    getCategoryResults.mockResolvedValue({ users: [], totalVotes: 0 });

    const response = await GET(
      new Request("http://localhost/api/results/id?event=halloween-2026"),
      {
        params: Promise.resolve({
          categoryId: "507f1f77bcf86cd799439011",
        }),
      },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await response.json()).toEqual({ users: [], totalVotes: 0 });
  });

  it("serves the open round to an administrator before publication", async () => {
    getCategoryById.mockResolvedValue({
      _id: "507f1f77bcf86cd799439011",
      eventId: "507f1f77bcf86cd799439012",
    });
    getEventBySlug.mockResolvedValue({ _id: "507f1f77bcf86cd799439012" });
    isAdmin.mockResolvedValue(true);
    const openRound = { _id: { toString: () => "507f1f77bcf86cd799439013" } };
    getOpenVotingRound.mockResolvedValue(openRound);
    roundIncludesCategory.mockReturnValue(true);
    getCategoryResults.mockResolvedValue({ users: [], totalVotes: 0 });

    const response = await GET(
      new Request("http://localhost/api/results/id?event=halloween-2026"),
      { params: Promise.resolve({ categoryId: "507f1f77bcf86cd799439011" }) },
    );

    expect(response.status).toBe(200);
    expect(getCategoryResults).toHaveBeenCalledWith(
      "507f1f77bcf86cd799439012",
      "507f1f77bcf86cd799439011",
      "507f1f77bcf86cd799439013",
    );
  });
});
