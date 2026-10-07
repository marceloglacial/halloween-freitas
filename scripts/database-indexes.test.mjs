import { describe, expect, it, vi } from "vitest";
import {
  assertNoDuplicateData,
  getIndexIssues,
  requiredIndexes,
} from "./database-indexes.mjs";

function indexDatabase(indexes = {}) {
  return {
    collection: vi.fn((name) => ({
      indexes: vi
        .fn()
        .mockResolvedValue(indexes[name] ?? [{ key: { _id: 1 } }]),
    })),
  };
}

describe("database indexes", () => {
  it("reports every missing required index", async () => {
    const issues = await getIndexIssues(indexDatabase());
    expect(issues).toHaveLength(requiredIndexes.length);
    expect(issues).toContain("registration: missing");
    expect(issues).toContain("guest ownership: missing");
  });

  it("accepts indexes only when their options match", async () => {
    const indexes = Object.groupBy(
      requiredIndexes,
      ({ collection }) => collection,
    );
    const db = indexDatabase(
      Object.fromEntries(
        Object.entries(indexes).map(([collection, definitions]) => [
          collection,
          definitions.map(({ key, options }) => ({ key, ...options })),
        ]),
      ),
    );
    expect(await getIndexIssues(db)).toEqual([]);
  });

  it("rejects a guest ownership index that also covers legacy unlinked records", async () => {
    const definitions = Object.groupBy(
      requiredIndexes,
      ({ collection }) => collection,
    );
    const indexes = Object.fromEntries(
      Object.entries(definitions).map(([collection, entries]) => [
        collection,
        entries.map(({ key, options }) => ({ key, ...options })),
      ]),
    );
    indexes.users.find(
      (index) => index.key.clerkUserId,
    ).partialFilterExpression = undefined;
    expect(await getIndexIssues(indexDatabase(indexes))).toEqual([
      "guest ownership: incorrect partial filter",
    ]);
  });

  it("stops before creating indexes when linked ownership is duplicated", async () => {
    const db = {
      collection: () => ({
        aggregate: (pipeline) => ({
          limit: () => ({
            next: async () =>
              pipeline[0]?.$match?.clerkUserId ? { count: 2 } : null,
          }),
        }),
      }),
    };
    await expect(assertNoDuplicateData(db)).rejects.toThrow(
      "Resolve duplicate guest ownership records",
    );
  });

  it("checks registration duplicates across every event", async () => {
    const aggregate = vi.fn((pipeline) => ({
      limit: vi.fn(() => ({
        next: vi
          .fn()
          .mockResolvedValue(
            pipeline[0]?.$group?._id?.normalizedEmail ? { count: 2 } : null,
          ),
      })),
    }));
    const db = { collection: vi.fn(() => ({ aggregate })) };

    await expect(assertNoDuplicateData(db)).rejects.toThrow(
      "Resolve duplicate registration records",
    );
    const registrationPipeline = aggregate.mock.calls.find(
      ([pipeline]) => pipeline[0]?.$group?._id?.normalizedEmail,
    )[0];
    expect(registrationPipeline[0]).toHaveProperty("$group");
    expect(registrationPipeline[0]).not.toHaveProperty("$match");
  });
});
