import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { MongoServerError, type Db, type ObjectId } from "mongodb";

export const requestRateLimitPolicies = {
  rsvpAddress: { action: "rsvp-address", maximum: 60, windowMs: 15 * 60_000 },
  rsvpEmail: { action: "rsvp-email", maximum: 5, windowMs: 60 * 60_000 },
  guestLinkAddress: {
    action: "guest-link-address",
    maximum: 30,
    windowMs: 15 * 60_000,
  },
} as const;

export type RateLimitPolicy = {
  action: string;
  maximum: number;
  windowMs: number;
};

type RateLimitBucketDocument = {
  _id: string;
  eventId: ObjectId;
  action: string;
  count: number;
  expiresAt: Date;
};

export type RateLimitDecision = {
  allowed: boolean;
  retryAfterSeconds: number;
};

export function trustedClientAddress(request: Request): string | null {
  const headerValue = request.headers.get("x-real-ip")?.trim();
  if (headerValue && isIP(headerValue)) return headerValue;

  if (process.env.NODE_ENV !== "production") return "local-development";
  return null;
}

function rateLimitId(
  eventId: ObjectId,
  action: string,
  identity: string,
  windowStart: number,
) {
  const secret = process.env.CLERK_SECRET_KEY;
  if (!secret) throw new Error("RATE_LIMIT_SECRET_NOT_CONFIGURED");
  const digest = createHmac("sha256", secret)
    .update(`${eventId.toString()}\0${action}\0${identity}`)
    .digest("hex");
  return `${eventId.toString()}:${action}:${windowStart}:${digest}`;
}

export async function consumeRateLimit(
  db: Db,
  input: {
    eventId: ObjectId;
    policy: RateLimitPolicy;
    identity: string;
    now: Date;
  },
): Promise<RateLimitDecision> {
  const { eventId, policy, identity, now } = input;
  const nowMs = now.getTime();
  const windowStart = Math.floor(nowMs / policy.windowMs) * policy.windowMs;
  const windowEnd = windowStart + policy.windowMs;
  const _id = rateLimitId(eventId, policy.action, identity, windowStart);
  const buckets = db.collection<RateLimitBucketDocument>("requestRateLimits");

  try {
    await buckets.updateOne(
      { _id },
      {
        $setOnInsert: {
          _id,
          eventId,
          action: policy.action,
          count: 0,
          expiresAt: new Date(windowEnd),
        },
      },
      { upsert: true },
    );
  } catch (error) {
    // Concurrent first requests can race to insert the same deterministic bucket.
    if (!(error instanceof MongoServerError && error.code === 11000))
      throw error;
  }

  const increment = await buckets.updateOne(
    { _id, count: { $lt: policy.maximum } },
    { $inc: { count: 1 } },
  );
  return {
    allowed: increment.matchedCount === 1,
    retryAfterSeconds: Math.max(1, Math.ceil((windowEnd - nowMs) / 1000)),
  };
}

export function rateLimitResponse(retryAfterSeconds: number) {
  return Response.json(
    { error: "Muitas tentativas. Tente novamente mais tarde." },
    {
      status: 429,
      headers: {
        "Cache-Control": "no-store",
        "Retry-After": String(retryAfterSeconds),
      },
    },
  );
}
