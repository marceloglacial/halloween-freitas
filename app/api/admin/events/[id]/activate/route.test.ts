import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  isAdmin: vi.fn(),
  getEventById: vi.fn(),
  findOne: vi.fn(),
  updateMany: vi.fn(),
  updateOne: vi.fn(),
  endSession: vi.fn(),
}));

const session = {
  withTransaction: vi.fn(async (operation: () => Promise<void>) => operation()),
  endSession: mocks.endSession,
};

vi.mock("@/lib/auth/admin", () => ({ isAdmin: mocks.isAdmin }));
vi.mock("@/lib/events", () => ({ getEventById: mocks.getEventById }));
vi.mock("@/lib/db", () => ({
  getMongoClient: vi.fn().mockResolvedValue({
    startSession: () => session,
  }),
  getDb: vi.fn().mockResolvedValue({
    collection: () => ({
      findOne: mocks.findOne,
      updateMany: mocks.updateMany,
      updateOne: mocks.updateOne,
    }),
  }),
}));

import { POST } from "@/app/api/admin/events/[id]/activate/route";

const eventId = "507f1f77bcf86cd799439011";

describe("event activation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isAdmin.mockResolvedValue(true);
    mocks.findOne.mockResolvedValue({ _id: eventId });
    mocks.getEventById.mockResolvedValue({ _id: eventId, status: "active" });
  });

  it("archives the current event and activates the selected event in one transaction", async () => {
    const response = await POST(new Request("http://localhost"), {
      params: Promise.resolve({ id: eventId }),
    });

    expect(response.status).toBe(200);
    expect(session.withTransaction).toHaveBeenCalledOnce();
    expect(mocks.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ status: "active" }),
      expect.objectContaining({
        $set: expect.objectContaining({ status: "archived" }),
      }),
      { session },
    );
    expect(mocks.updateOne).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        $set: expect.objectContaining({ status: "active" }),
      }),
      { session },
    );
    expect(mocks.endSession).toHaveBeenCalledOnce();
  });

  it("returns not found without changing statuses", async () => {
    mocks.findOne.mockResolvedValue(null);
    const response = await POST(new Request("http://localhost"), {
      params: Promise.resolve({ id: eventId }),
    });
    expect(response.status).toBe(404);
    expect(mocks.updateMany).not.toHaveBeenCalled();
    expect(mocks.updateOne).not.toHaveBeenCalled();
  });
});
