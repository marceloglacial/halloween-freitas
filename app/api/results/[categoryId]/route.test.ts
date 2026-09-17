import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCategoryById, getEventBySlug } = vi.hoisted(() => ({
  getCategoryById: vi.fn(),
  getEventBySlug: vi.fn(),
}));

vi.mock("@/util/get-categories", () => ({ getCategoryById }));
vi.mock("@/lib/events", () => ({
  getEventBySlug,
  resultsArePublic: vi.fn().mockReturnValue(false),
}));
vi.mock("@/lib/results", () => ({ getCategoryResults: vi.fn() }));

import { GET } from "@/app/api/results/[categoryId]/route";

describe("results API publication rules", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects malformed category IDs", async () => {
    const response = await GET(new Request("http://localhost/api/results/x"), {
      params: Promise.resolve({ categoryId: "invalid" }),
    });
    expect(response.status).toBe(400);
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
  });
});
