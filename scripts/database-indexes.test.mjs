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

  it("expires request rate-limit buckets automatically", () => {
    expect(
      requiredIndexes.find(
        ({ label }) => label === "request rate-limit expiry",
      ),
    ).toEqual({
      collection: "requestRateLimits",
      label: "request rate-limit expiry",
      key: { expiresAt: 1 },
      options: { expireAfterSeconds: 0 },
    });
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

  it("uniquely scopes adult-owned contestant types to an event and RSVP", () => {
    expect(
      requiredIndexes.find(
        ({ label }) => label === "adult contestant ownership",
      ),
    ).toEqual({
      collection: "contestants",
      label: "adult contestant ownership",
      key: { eventId: 1, ownerRsvpId: 1, entryType: 1 },
      options: {
        unique: true,
        partialFilterExpression: {
          ownerRsvpId: { $type: "objectId" },
        },
      },
    });
    expect(
      requiredIndexes.find(
        ({ label }) => label === "guardian contestant entries",
      ),
    ).toMatchObject({
      collection: "contestants",
      key: { eventId: 1, guardianRsvpId: 1 },
      options: {},
    });
  });

  it("detects duplicate adult contestant ownership before index creation", async () => {
    const db = {
      collection: () => ({
        aggregate: (pipeline) => ({
          limit: () => ({
            next: async () =>
              pipeline[0]?.$match?.ownerRsvpId ? { count: 2 } : null,
          }),
        }),
      }),
    };
    await expect(assertNoDuplicateData(db)).rejects.toThrow(
      "Resolve duplicate adult contestant ownership records",
    );
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

  it("checks category order duplicates within each event", async () => {
    const aggregate = vi.fn((pipeline) => ({
      limit: vi.fn(() => ({
        next: vi
          .fn()
          .mockResolvedValue(
            pipeline[0]?.$group?._id?.order === "$order" ? { count: 2 } : null,
          ),
      })),
    }));
    const db = { collection: vi.fn(() => ({ aggregate })) };

    await expect(assertNoDuplicateData(db)).rejects.toThrow(
      "Resolve duplicate category order records",
    );
    const categoryPipeline = aggregate.mock.calls.find(
      ([pipeline]) => pipeline[0]?.$group?._id?.order === "$order",
    )[0];
    expect(categoryPipeline[0].$group._id).toEqual({
      eventId: "$eventId",
      order: "$order",
    });
  });

  it("requires event-scoped voting rounds and unique per-round ballots", () => {
    expect(
      requiredIndexes.find(({ label }) => label === "round type per event"),
    ).toMatchObject({
      collection: "votingRounds",
      key: { eventId: 1, type: 1 },
      options: { unique: true },
    });
    expect(
      requiredIndexes.find(({ label }) => label === "one open round per event"),
    ).toMatchObject({
      collection: "votingRounds",
      key: { eventId: 1 },
      options: {
        unique: true,
        partialFilterExpression: { status: "open" },
      },
    });
    expect(requiredIndexes.find(({ label }) => label === "vote")).toMatchObject(
      {
        collection: "votes",
        key: {
          eventId: 1,
          roundId: 1,
          categoryId: 1,
          voterRsvpId: 1,
        },
        options: {
          unique: true,
          partialFilterExpression: {
            roundId: { $type: "objectId" },
            voterRsvpId: { $type: "objectId" },
          },
        },
      },
    );
  });

  it("checks ballot duplicates only for round-scoped ballot documents", async () => {
    const aggregate = vi.fn((pipeline) => ({
      limit: () => ({
        next: async () => (pipeline[0]?.$match?.roundId ? { count: 2 } : null),
      }),
    }));
    const db = { collection: vi.fn(() => ({ aggregate })) };
    await expect(assertNoDuplicateData(db)).rejects.toThrow(
      "Resolve duplicate vote records",
    );
    const ballotPipeline = aggregate.mock.calls.find(
      ([pipeline]) => pipeline[0]?.$match?.roundId,
    )[0];
    expect(ballotPipeline[0].$match).toEqual({
      roundId: { $type: "objectId" },
      voterRsvpId: { $type: "objectId" },
    });
    expect(ballotPipeline[1].$group._id).toEqual({
      eventId: "$eventId",
      roundId: "$roundId",
      categoryId: "$categoryId",
      voterRsvpId: "$voterRsvpId",
    });
  });
});
