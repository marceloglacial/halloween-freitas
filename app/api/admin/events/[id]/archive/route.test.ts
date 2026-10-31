import { beforeEach, describe, expect, it, vi } from "vitest";
import { ObjectId } from "mongodb";

const mocks = vi.hoisted(() => ({
  isAdmin: vi.fn(),
  getEventById: vi.fn(),
  findOne: vi.fn(),
  eventUpdateOne: vi.fn(),
  roundUpdateOne: vi.fn(),
  withTransaction: vi.fn(),
  endSession: vi.fn(),
}));

const session = {
  withTransaction: mocks.withTransaction,
  endSession: mocks.endSession,
};

vi.mock("@/lib/auth/admin", () => ({ isAdmin: mocks.isAdmin }));
vi.mock("@/lib/events", () => ({ getEventById: mocks.getEventById }));
vi.mock("@/lib/db", () => ({
  getMongoClient: vi.fn().mockResolvedValue({ startSession: () => session }),
  getDb: vi.fn().mockResolvedValue({
    collection: (name: string) =>
      name === "events"
        ? { findOne: mocks.findOne, updateOne: mocks.eventUpdateOne }
        : { updateOne: mocks.roundUpdateOne },
  }),
}));

import { POST } from "@/app/api/admin/events/[id]/archive/route";

const eventId = "507f1f77bcf86cd799439011";

describe("event archival", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isAdmin.mockResolvedValue(true);
    mocks.findOne.mockResolvedValue({ votingStatus: "open" });
    mocks.eventUpdateOne.mockResolvedValue({ matchedCount: 1 });
    mocks.roundUpdateOne.mockResolvedValue({ matchedCount: 1 });
    mocks.withTransaction.mockImplementation(async (callback) => callback());
    mocks.getEventById.mockResolvedValue({ _id: eventId, status: "archived" });
  });

  it("rejects non-admin requests before reading or changing event state", async () => {
    mocks.isAdmin.mockResolvedValue(false);

    const response = await POST(new Request("http://localhost"), {
      params: Promise.resolve({ id: eventId }),
    });

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Não autorizado" });
    expect(mocks.findOne).not.toHaveBeenCalled();
    expect(mocks.eventUpdateOne).not.toHaveBeenCalled();
    expect(mocks.roundUpdateOne).not.toHaveBeenCalled();
    expect(mocks.getEventById).not.toHaveBeenCalled();
  });

  it("ends the open round in the same transaction as archival", async () => {
    const response = await POST(new Request("http://localhost"), {
      params: Promise.resolve({ id: eventId }),
    });
    expect(response.status).toBe(200);
    expect(mocks.eventUpdateOne).toHaveBeenCalledWith(
      { _id: new ObjectId(eventId) },
      expect.objectContaining({
        $set: expect.objectContaining({
          status: "archived",
          votingStatus: "ended",
        }),
      }),
      { session },
    );
    expect(mocks.roundUpdateOne).toHaveBeenCalledWith(
      { eventId: new ObjectId(eventId), status: "open" },
      expect.objectContaining({
        $set: expect.objectContaining({ status: "ended" }),
      }),
      { session },
    );
  });

  it("returns not found without changing the event", async () => {
    mocks.findOne.mockResolvedValue(null);
    const response = await POST(new Request("http://localhost"), {
      params: Promise.resolve({ id: eventId }),
    });
    expect(response.status).toBe(404);
    expect(mocks.eventUpdateOne).not.toHaveBeenCalled();
    expect(mocks.roundUpdateOne).not.toHaveBeenCalled();
  });
});
