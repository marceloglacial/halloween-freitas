import { beforeEach, describe, expect, it, vi } from "vitest";
import { ObjectId } from "mongodb";

const mocks = vi.hoisted(() => ({
  isAdmin: vi.fn(),
  getDb: vi.fn(),
  getMongoClient: vi.fn(),
  getEventById: vi.fn(),
  getCategories: vi.fn(),
  eventFindOne: vi.fn(),
  eventUpdateOne: vi.fn(),
  categoryFind: vi.fn(),
  categoryUpdateOne: vi.fn(),
  categoryDeleteMany: vi.fn(),
  categoryInsertMany: vi.fn(),
  voteFindOne: vi.fn(),
  endSession: vi.fn(),
  withTransaction: vi.fn(),
}));

vi.mock("@/lib/auth/admin", () => ({ isAdmin: mocks.isAdmin }));
vi.mock("@/lib/db", () => ({
  getDb: mocks.getDb,
  getMongoClient: mocks.getMongoClient,
}));
vi.mock("@/lib/events", () => ({ getEventById: mocks.getEventById }));
vi.mock("@/util/get-categories", () => ({
  getCategories: mocks.getCategories,
}));

import { GET, PUT } from "@/app/api/admin/events/[id]/categories/route";

const eventId = "507f1f77bcf86cd799439011";
const categoryIds = [
  "507f1f77bcf86cd799439012",
  "507f1f77bcf86cd799439013",
  "507f1f77bcf86cd799439014",
];
const params = { params: Promise.resolve({ id: eventId }) };

function request(categories?: unknown) {
  return new Request("http://localhost", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ categories }),
  });
}

describe("admin event categories API", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.isAdmin.mockResolvedValue(true);
    mocks.getEventById.mockResolvedValue({ _id: eventId });
    mocks.getCategories.mockResolvedValue([]);
    mocks.eventFindOne.mockResolvedValue({ votingStatus: "not_started" });
    mocks.eventUpdateOne.mockResolvedValue({ matchedCount: 1 });
    mocks.categoryFind.mockReturnValue({
      toArray: vi.fn().mockResolvedValue([]),
    });
    mocks.categoryUpdateOne.mockResolvedValue({ matchedCount: 1 });
    mocks.categoryDeleteMany.mockResolvedValue({ deletedCount: 1 });
    mocks.categoryInsertMany.mockResolvedValue({});
    mocks.voteFindOne.mockResolvedValue(null);
    mocks.withTransaction.mockImplementation(
      async (operation: () => Promise<void>) => operation(),
    );
    mocks.getMongoClient.mockResolvedValue({
      startSession: () => ({
        withTransaction: mocks.withTransaction,
        endSession: mocks.endSession,
      }),
    });
    mocks.getDb.mockResolvedValue({
      collection: (name: string) => {
        if (name === "events") {
          return {
            findOne: mocks.eventFindOne,
            updateOne: mocks.eventUpdateOne,
          };
        }
        if (name === "categories") {
          return {
            find: mocks.categoryFind,
            updateOne: mocks.categoryUpdateOne,
            deleteMany: mocks.categoryDeleteMany,
            insertMany: mocks.categoryInsertMany,
          };
        }
        return { findOne: mocks.voteFindOne };
      },
    });
  });

  it("requires administrator access", async () => {
    mocks.isAdmin.mockResolvedValue(false);
    expect((await GET(new Request("http://localhost"), params)).status).toBe(
      401,
    );
    expect((await PUT(request([]), params)).status).toBe(401);
    expect(mocks.getMongoClient).not.toHaveBeenCalled();
  });

  it("loads categories for the requested event", async () => {
    mocks.getCategories.mockResolvedValue([{ _id: categoryIds[0] }]);
    const response = await GET(new Request("http://localhost"), params);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([{ _id: categoryIds[0] }]);
    expect(mocks.getCategories).toHaveBeenCalledWith(eventId);
  });

  it("returns not found when the event does not exist", async () => {
    mocks.getEventById.mockResolvedValue(null);
    const response = await GET(new Request("http://localhost"), params);
    expect(response.status).toBe(404);
    expect(mocks.getCategories).not.toHaveBeenCalled();
  });

  it("rejects an empty category list", async () => {
    expect((await PUT(request([]), params)).status).toBe(400);
    expect(mocks.withTransaction).not.toHaveBeenCalled();
  });

  it("returns not found rather than saving categories for a missing event", async () => {
    mocks.eventFindOne.mockResolvedValue(null);
    const response = await PUT(
      request([{ title: "Geral", icon: "", order: 0, eligibility: "all" }]),
      params,
    );
    expect(response.status).toBe(404);
    expect(mocks.eventUpdateOne).not.toHaveBeenCalled();
  });

  it("locks category changes after voting opens", async () => {
    mocks.eventUpdateOne.mockResolvedValue({ matchedCount: 0 });
    const response = await PUT(
      request([{ title: "Geral", icon: "", order: 0, eligibility: "all" }]),
      params,
    );
    expect(response.status).toBe(409);
    expect(mocks.categoryUpdateOne).not.toHaveBeenCalled();
  });

  it("rejects a category ID that belongs to another event", async () => {
    mocks.categoryFind.mockReturnValue({
      toArray: vi.fn().mockResolvedValue([
        {
          _id: new ObjectId(categoryIds[0]),
          eventId: new ObjectId(eventId),
          title: "Geral",
          icon: "",
          order: 0,
          eligibility: "all",
        },
      ]),
    });

    const response = await PUT(
      request([
        {
          _id: categoryIds[1],
          title: "Geral",
          icon: "",
          order: 0,
          eligibility: "all",
        },
      ]),
      params,
    );

    expect(response.status).toBe(400);
    expect(mocks.categoryUpdateOne).not.toHaveBeenCalled();
    expect(mocks.categoryDeleteMany).not.toHaveBeenCalled();
  });

  it("rejects removal when ballots reference a category", async () => {
    mocks.categoryFind.mockReturnValue({
      toArray: vi.fn().mockResolvedValue([
        {
          _id: new ObjectId(categoryIds[0]),
          eventId: new ObjectId(eventId),
          title: "Geral",
          icon: "",
          order: 0,
          eligibility: "all",
        },
        {
          _id: new ObjectId(categoryIds[1]),
          eventId: new ObjectId(eventId),
          title: "Grupo",
          icon: "",
          order: 1,
          eligibility: "group",
        },
      ]),
    });
    mocks.voteFindOne.mockResolvedValue({ _id: new ObjectId() });

    const response = await PUT(
      request([
        {
          _id: categoryIds[0],
          title: "Geral",
          icon: "",
          order: 0,
          eligibility: "all",
        },
      ]),
      params,
    );

    expect(response.status).toBe(409);
    expect(mocks.categoryDeleteMany).not.toHaveBeenCalled();
  });

  it("preserves existing IDs while updating, reordering, adding, and removing", async () => {
    const current = categoryIds.map((categoryId, order) => ({
      _id: new ObjectId(categoryId),
      eventId: new ObjectId(eventId),
      title: `Categoria ${order}`,
      icon: "",
      order,
      eligibility: "all",
    }));
    mocks.categoryFind.mockReturnValue({
      toArray: vi.fn().mockResolvedValue(current),
    });
    mocks.getCategories.mockResolvedValue([{ _id: categoryIds[0] }]);

    const response = await PUT(
      request([
        {
          _id: categoryIds[1],
          title: "Grupo atualizado",
          icon: "🎃",
          order: 0,
          eligibility: "group",
        },
        {
          _id: categoryIds[0],
          title: "Geral atualizado",
          icon: "👻",
          order: 1,
          eligibility: "all",
        },
        {
          title: "Grupo",
          icon: "👥",
          order: 2,
          eligibility: "group",
        },
      ]),
      params,
    );

    expect(response.status).toBe(200);
    expect(mocks.categoryDeleteMany).toHaveBeenCalledWith(
      {
        eventId: new ObjectId(eventId),
        _id: { $in: [new ObjectId(categoryIds[2])] },
      },
      expect.objectContaining({ session: expect.any(Object) }),
    );
    expect(mocks.categoryUpdateOne).toHaveBeenCalledWith(
      { _id: new ObjectId(categoryIds[1]), eventId: new ObjectId(eventId) },
      {
        $set: {
          title: "Grupo atualizado",
          icon: "🎃",
          order: 0,
          eligibility: "group",
        },
      },
      expect.objectContaining({ session: expect.any(Object) }),
    );
    expect(mocks.categoryUpdateOne).toHaveBeenCalledWith(
      { _id: new ObjectId(categoryIds[0]), eventId: new ObjectId(eventId) },
      {
        $set: {
          title: "Geral atualizado",
          icon: "👻",
          order: 1,
          eligibility: "all",
        },
      },
      expect.objectContaining({ session: expect.any(Object) }),
    );
    expect(mocks.categoryInsertMany).toHaveBeenCalledWith(
      [
        {
          _id: expect.any(ObjectId),
          title: "Grupo",
          icon: "👥",
          order: 2,
          eligibility: "group",
          eventId: new ObjectId(eventId),
        },
      ],
      expect.objectContaining({ session: expect.any(Object) }),
    );
  });
});
