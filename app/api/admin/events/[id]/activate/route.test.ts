import { beforeEach, describe, expect, it, vi } from "vitest";
import { ObjectId } from "mongodb";

const mocks = vi.hoisted(() => ({
  isAdmin: vi.fn(),
  getEventById: vi.fn(),
  findOne: vi.fn(),
  eventList: vi.fn(),
  updateMany: vi.fn(),
  roundUpdateMany: vi.fn(),
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
    collection: (name: string) =>
      name === "votingRounds"
        ? { updateMany: mocks.roundUpdateMany }
        : {
            findOne: mocks.findOne,
            find: () => ({ toArray: mocks.eventList }),
            updateMany: mocks.updateMany,
            updateOne: mocks.updateOne,
          },
  }),
}));

import { POST } from "@/app/api/admin/events/[id]/activate/route";

const eventId = "507f1f77bcf86cd799439011";

describe("event activation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isAdmin.mockResolvedValue(true);
    mocks.findOne.mockResolvedValue({ _id: eventId });
    mocks.eventList.mockResolvedValue([{ _id: new ObjectId(eventId) }]);
    mocks.roundUpdateMany.mockResolvedValue({ modifiedCount: 1 });
    mocks.getEventById.mockResolvedValue({ _id: eventId, status: "active" });
  });

  it("rejects non-admin requests before starting activation work", async () => {
    mocks.isAdmin.mockResolvedValue(false);

    const response = await POST(new Request("http://localhost"), {
      params: Promise.resolve({ id: eventId }),
    });

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Não autorizado" });
    expect(mocks.findOne).not.toHaveBeenCalled();
    expect(mocks.eventList).not.toHaveBeenCalled();
    expect(mocks.roundUpdateMany).not.toHaveBeenCalled();
    expect(mocks.updateMany).not.toHaveBeenCalled();
    expect(mocks.updateOne).not.toHaveBeenCalled();
    expect(mocks.getEventById).not.toHaveBeenCalled();
    expect(session.withTransaction).not.toHaveBeenCalled();
    expect(mocks.endSession).not.toHaveBeenCalled();
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
    expect(mocks.roundUpdateMany).toHaveBeenCalledWith(
      { eventId: { $in: [expect.any(ObjectId)] }, status: "open" },
      expect.objectContaining({
        $set: expect.objectContaining({ status: "ended" }),
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
