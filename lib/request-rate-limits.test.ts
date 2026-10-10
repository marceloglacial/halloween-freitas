import { afterEach, describe, expect, it, vi } from "vitest";
import { ObjectId } from "mongodb";
import {
  consumeRateLimit,
  requestRateLimitPolicies,
  trustedClientAddress,
} from "@/lib/request-rate-limits";

const eventId = new ObjectId("507f1f77bcf86cd799439011");
const now = new Date("2026-09-15T12:00:05.000Z");

function limiterDatabase() {
  const buckets = new Map<string, Record<string, unknown>>();
  const updateOne = vi.fn(
    async (
      filter: { _id: string; count?: { $lt: number } },
      update: {
        $setOnInsert?: Record<string, unknown>;
        $inc?: { count: number };
      },
      options?: { upsert?: boolean },
    ) => {
      const current = buckets.get(filter._id);
      if (options?.upsert) {
        if (!current) {
          buckets.set(filter._id, { ...update.$setOnInsert });
          return { matchedCount: 0, upsertedCount: 1 };
        }
        return { matchedCount: 1, upsertedCount: 0 };
      }
      if (
        current &&
        filter.count &&
        typeof current.count === "number" &&
        current.count < filter.count.$lt
      ) {
        current.count += update.$inc?.count ?? 0;
        return { matchedCount: 1, upsertedCount: 0 };
      }
      return { matchedCount: 0, upsertedCount: 0 };
    },
  );
  return {
    db: { collection: () => ({ updateOne }) } as never,
    buckets,
    updateOne,
  };
}

afterEach(() => vi.unstubAllEnvs());

describe("request rate limits", () => {
  it("allows up to the policy maximum and returns a fixed retry window", async () => {
    vi.stubEnv("CLERK_SECRET_KEY", "test-clerk-secret");
    const fixture = limiterDatabase();
    const input = {
      eventId,
      policy: { action: "test", maximum: 2, windowMs: 60_000 },
      identity: "203.0.113.8",
      now,
    } as const;

    await expect(consumeRateLimit(fixture.db, input)).resolves.toMatchObject({
      allowed: true,
      retryAfterSeconds: 55,
    });
    await expect(consumeRateLimit(fixture.db, input)).resolves.toMatchObject({
      allowed: true,
      retryAfterSeconds: 55,
    });
    await expect(consumeRateLimit(fixture.db, input)).resolves.toMatchObject({
      allowed: false,
      retryAfterSeconds: 55,
    });
  });

  it("caps concurrent increments at the configured maximum", async () => {
    vi.stubEnv("CLERK_SECRET_KEY", "test-clerk-secret");
    const fixture = limiterDatabase();
    const decisions = await Promise.all(
      Array.from({ length: 40 }, () =>
        consumeRateLimit(fixture.db, {
          eventId,
          policy: { action: "concurrent", maximum: 7, windowMs: 60_000 },
          identity: "same-client",
          now,
        }),
      ),
    );

    expect(decisions.filter(({ allowed }) => allowed)).toHaveLength(7);
    expect(decisions.filter(({ allowed }) => !allowed)).toHaveLength(33);
    expect([...fixture.buckets.values()][0].count).toBe(7);
  });

  it("isolates buckets by event and expires each fixed window", async () => {
    vi.stubEnv("CLERK_SECRET_KEY", "test-clerk-secret");
    const fixture = limiterDatabase();
    const policy = { action: "isolation", maximum: 10, windowMs: 60_000 };

    await consumeRateLimit(fixture.db, {
      eventId,
      policy,
      identity: "same-client",
      now,
    });
    await consumeRateLimit(fixture.db, {
      eventId: new ObjectId("507f1f77bcf86cd799439015"),
      policy,
      identity: "same-client",
      now,
    });
    await consumeRateLimit(fixture.db, {
      eventId,
      policy,
      identity: "same-client",
      now: new Date(now.getTime() + 60_000),
    });

    expect(fixture.buckets.size).toBe(3);
    expect(fixture.updateOne).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: expect.stringContaining(eventId.toString()),
      }),
      expect.objectContaining({ $setOnInsert: expect.any(Object) }),
      { upsert: true },
    );
  });

  it("stores HMAC identities instead of raw email or client address", async () => {
    vi.stubEnv("CLERK_SECRET_KEY", "test-clerk-secret");
    const fixture = limiterDatabase();

    await consumeRateLimit(fixture.db, {
      eventId,
      policy: requestRateLimitPolicies.rsvpEmail,
      identity: "private.person@example.com",
      now,
    });

    const serialized = JSON.stringify([...fixture.buckets.entries()]);
    expect(serialized).not.toContain("private.person@example.com");
    expect([...fixture.buckets.values()][0]).not.toHaveProperty("identity");
  });

  it("uses only the trusted x-real-ip value and fails closed in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(
      trustedClientAddress(
        new Request("http://localhost", {
          headers: {
            "x-real-ip": "203.0.113.8",
            "x-forwarded-for": "198.51.100.4",
          },
        }),
      ),
    ).toBe("203.0.113.8");
    expect(
      trustedClientAddress(
        new Request("http://localhost", {
          headers: { "x-forwarded-for": "198.51.100.4" },
        }),
      ),
    ).toBeNull();
  });
});
