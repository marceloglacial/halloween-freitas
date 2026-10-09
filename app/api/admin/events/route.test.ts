import { beforeEach, describe, expect, it, vi } from "vitest";
import { ObjectId } from "mongodb";

const mocks = vi.hoisted(() => ({
  isAdmin: vi.fn(),
  getEvents: vi.fn(),
  getEventById: vi.fn(),
  getDb: vi.fn(),
  getMongoClient: vi.fn(),
  findOne: vi.fn(),
  find: vi.fn(),
  insertOne: vi.fn(),
  insertMany: vi.fn(),
  endSession: vi.fn(),
  withTransaction: vi.fn(),
}));

vi.mock("@/lib/auth/admin", () => ({ isAdmin: mocks.isAdmin }));
vi.mock("@/lib/events", () => ({
  getEvents: mocks.getEvents,
  getEventById: mocks.getEventById,
}));
vi.mock("@/lib/db", () => ({
  getDb: mocks.getDb,
  getMongoClient: mocks.getMongoClient,
}));

import { GET, POST } from "@/app/api/admin/events/route";

describe("admin events API", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.isAdmin.mockResolvedValue(true);
    mocks.getDb.mockResolvedValue({
      collection: (name: string) =>
        name === "events"
          ? { findOne: mocks.findOne, insertOne: mocks.insertOne }
          : { find: mocks.find, insertMany: mocks.insertMany },
    });
    mocks.getMongoClient.mockResolvedValue({
      startSession: () => ({
        withTransaction: mocks.withTransaction,
        endSession: mocks.endSession,
      }),
    });
    mocks.withTransaction.mockImplementation(
      async (operation: () => Promise<unknown>) => operation(),
    );
    mocks.findOne.mockResolvedValue(null);
    mocks.find.mockReturnValue({ toArray: vi.fn().mockResolvedValue([]) });
    mocks.insertOne.mockResolvedValue({ insertedId: new ObjectId() });
    mocks.insertMany.mockResolvedValue({});
    mocks.getEventById.mockResolvedValue({ _id: "created" });
  });

  it("rejects event listing for non-admins", async () => {
    mocks.isAdmin.mockResolvedValue(false);
    expect((await GET()).status).toBe(401);
    expect(mocks.getEvents).not.toHaveBeenCalled();
  });

  it("rejects event creation for non-admins before reading input", async () => {
    mocks.isAdmin.mockResolvedValue(false);
    const response = await POST(
      new Request("http://localhost/api/admin/events", {
        method: "POST",
        body: "invalid",
      }),
    );
    expect(response.status).toBe(401);
  });

  it("lists events for admins", async () => {
    mocks.getEvents.mockResolvedValue([{ year: 2026 }]);
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([{ year: 2026 }]);
  });

  it("rejects event creation without category configuration", async () => {
    const response = await POST(
      new Request("http://localhost/api/admin/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year: 2026,
          title: "Halloween 2026",
          timezone: "America/Toronto",
          registrationStartsAt: "2026-09-01T00:00",
          eventStartsAt: "2026-10-31T20:00",
        }),
      }),
    );
    expect(response.status).toBe(400);
    expect(mocks.getMongoClient).not.toHaveBeenCalled();
  });

  it("rejects an event starting before registration before opening a database session", async () => {
    const response = await POST(
      new Request("http://localhost/api/admin/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year: 2026,
          title: "Halloween 2026",
          timezone: "America/Toronto",
          registrationStartsAt: "2026-10-31T20:01",
          eventStartsAt: "2026-10-31T20:00",
          categories: [
            { title: "Geral", icon: "🎃", order: 0, eligibility: "all" },
          ],
        }),
      }),
    );

    expect(response.status).toBe(400);
    expect(mocks.getMongoClient).not.toHaveBeenCalled();
    expect(mocks.insertOne).not.toHaveBeenCalled();
  });

  it("creates a first edition with BSON dates and event-scoped categories", async () => {
    const insertedId = new ObjectId();
    mocks.insertOne.mockResolvedValue({ insertedId });

    const response = await POST(
      new Request("http://localhost/api/admin/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year: 2026,
          title: "Halloween 2026",
          timezone: "America/Toronto",
          registrationStartsAt: "2026-09-01T00:00",
          eventStartsAt: "2026-10-31T20:00",
          categories: [
            { title: "Geral", icon: "🎃", order: 0, eligibility: "all" },
            {
              title: "Infantil",
              icon: "👻",
              order: 1,
              eligibility: "junior",
            },
          ],
        }),
      }),
    );

    expect(response.status).toBe(201);
    const insertedEvent = mocks.insertOne.mock.calls[0][0];
    expect(insertedEvent).toMatchObject({
      year: 2026,
      slug: "halloween-2026",
      status: "archived",
      contestEntryStatus: "open",
    });
    expect(insertedEvent.registrationStartsAt).toEqual(
      new Date("2026-09-01T04:00:00.000Z"),
    );
    expect(insertedEvent.eventStartsAt).toEqual(
      new Date("2026-11-01T00:00:00.000Z"),
    );
    expect(mocks.insertMany).toHaveBeenCalledWith(
      [
        expect.objectContaining({ title: "Geral", eventId: insertedId }),
        expect.objectContaining({ title: "Infantil", eventId: insertedId }),
      ],
      expect.objectContaining({ session: expect.any(Object) }),
    );
    expect(mocks.withTransaction).toHaveBeenCalledOnce();
    expect(mocks.endSession).toHaveBeenCalledOnce();
  });
});
