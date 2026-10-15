import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getActiveEvent: vi.fn(),
  getCategories: vi.fn(),
}));

vi.mock("@/lib/events", () => ({
  getActiveEvent: mocks.getActiveEvent,
  getEventPhase: vi.fn(() => "registration"),
}));
vi.mock("@/util/get-categories", () => ({
  getCategories: mocks.getCategories,
}));

import { GET } from "@/app/api/events/current/route";

describe("current active event endpoint", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.getCategories.mockResolvedValue([]);
  });

  it("returns not found when the database has no active edition", async () => {
    mocks.getActiveEvent.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(404);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(mocks.getActiveEvent).toHaveBeenCalledOnce();
    expect(mocks.getCategories).not.toHaveBeenCalled();
  });

  it("returns the active edition, its categories, and disables response caching", async () => {
    const activeEvent = {
      _id: "507f1f77bcf86cd799439011",
      slug: "halloween-2026",
      status: "active",
    };
    const categories = [
      {
        _id: "category-1",
        eventId: activeEvent._id,
        title: "Melhor Fantasia",
        icon: "🏆",
        order: 0,
        eligibility: "all",
      },
    ];
    mocks.getActiveEvent.mockResolvedValue(activeEvent);
    mocks.getCategories.mockResolvedValue(categories);

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ...activeEvent,
      phase: "registration",
      categories,
    });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(mocks.getCategories).toHaveBeenCalledWith(activeEvent._id);
  });

  it("serves category changes on the next homepage refresh for the active edition", async () => {
    const activeEvent = {
      _id: "507f1f77bcf86cd799439011",
      slug: "halloween-2026",
      status: "active",
    };
    const firstCategories = [
      { _id: "category-1", title: "Fantasia", order: 0 },
    ];
    const updatedCategories = [
      { _id: "category-2", title: "Categoria atualizada", order: 0 },
    ];
    mocks.getActiveEvent.mockResolvedValue(activeEvent);
    mocks.getCategories
      .mockResolvedValueOnce(firstCategories)
      .mockResolvedValueOnce(updatedCategories);

    const firstResponse = await GET();
    const refreshedResponse = await GET();

    await expect(firstResponse.json()).resolves.toMatchObject({
      categories: firstCategories,
    });
    await expect(refreshedResponse.json()).resolves.toMatchObject({
      categories: updatedCategories,
    });
    expect(mocks.getCategories).toHaveBeenNthCalledWith(1, activeEvent._id);
    expect(mocks.getCategories).toHaveBeenNthCalledWith(2, activeEvent._id);
  });
});
