import { beforeEach, describe, expect, it, vi } from "vitest";
import { ObjectId } from "mongodb";

const mocks = vi.hoisted(() => ({ getDb: vi.fn(), collection: vi.fn() }));
vi.mock("@/lib/db", () => ({ getDb: mocks.getDb }));

import { getAdminEventOverview } from "@/lib/admin-event-overview";

const eventId = "507f1f77bcf86cd799439011";
const queries: Record<string, unknown[]> = {};

beforeEach(() => {
  vi.clearAllMocks();
  for (const key of Object.keys(queries)) delete queries[key];
  const collections: Record<
    string,
    {
      countDocuments: (query: unknown) => Promise<number>;
      find: (query: unknown) => { toArray: () => Promise<unknown[]> };
      findOne: (query: unknown) => Promise<{ published: boolean }>;
    }
  > = {};
  for (const name of [
    "users",
    "votes",
    "categories",
    "contestants",
    "partyPhotos",
    "partyAlbums",
  ]) {
    collections[name] = {
      countDocuments: async (query: unknown) => {
        queries[name] = [query];
        return name === "users"
          ? 5
          : name === "votes"
            ? 9
            : name === "partyPhotos"
              ? 2
              : 0;
      },
      find: (query: unknown) => {
        queries[name] = [query];
        return { toArray: async () => [] };
      },
      findOne: async (query: unknown) => {
        queries[name] = [query];
        return { published: true };
      },
    };
  }
  mocks.getDb.mockResolvedValue({
    collection: (name: string) => collections[name],
  });
});

describe("getAdminEventOverview", () => {
  it("scopes each KPI query to the selected edition and excludes removed photos", async () => {
    const result = await getAdminEventOverview(eventId);
    const scopedId = new ObjectId(eventId);
    expect(result).toEqual({
      confirmedRsvps: 5,
      eligibleContestants: 0,
      votes: 9,
      categories: 0,
      partyPhotos: 2,
      albumPublished: true,
    });
    expect(queries.users?.[0]).toEqual({
      eventId: scopedId,
      status: { $ne: "cancelled" },
    });
    expect(queries.votes?.[0]).toEqual({ eventId: scopedId });
    expect(queries.categories?.[0]).toEqual({ eventId: scopedId });
    expect(queries.contestants?.[0]).toEqual({
      eventId: scopedId,
      status: { $in: ["draft", "ready", "locked"] },
    });
    expect(queries.partyPhotos?.[0]).toEqual({
      eventId: scopedId,
      removedAt: { $exists: false },
    });
    expect(queries.partyAlbums?.[0]).toEqual({ eventId: scopedId });
  });

  it("rejects malformed event ids before accessing the database", async () => {
    await expect(getAdminEventOverview("bad-id")).rejects.toThrow(
      "INVALID_EVENT_ID",
    );
    expect(mocks.getDb).not.toHaveBeenCalled();
  });
});
