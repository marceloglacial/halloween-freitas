import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getActiveEvent: vi.fn() }));

vi.mock("@/lib/events", () => ({
  getActiveEvent: mocks.getActiveEvent,
  getEventPhase: vi.fn(() => "registration"),
}));

import { GET } from "@/app/api/events/current/route";

describe("current active event endpoint", () => {
  beforeEach(() => vi.resetAllMocks());

  it("returns not found when the database has no active edition", async () => {
    mocks.getActiveEvent.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(404);
    expect(mocks.getActiveEvent).toHaveBeenCalledOnce();
  });

  it("returns the active edition and its phase", async () => {
    const activeEvent = {
      _id: "507f1f77bcf86cd799439011",
      slug: "halloween-2026",
      status: "active",
    };
    mocks.getActiveEvent.mockResolvedValue(activeEvent);

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ...activeEvent,
      phase: "registration",
    });
  });
});
