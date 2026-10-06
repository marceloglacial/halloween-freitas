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
