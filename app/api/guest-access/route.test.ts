import { beforeEach, describe, expect, it, vi } from "vitest";
import { ObjectId } from "mongodb";

const mocks = vi.hoisted(() => ({
  event: vi.fn(),
  getDb: vi.fn(),
  findGuest: vi.fn(),
  consumeRateLimit: vi.fn(),
  trustedClientAddress: vi.fn(),
}));
vi.mock("@/lib/events", () => ({ getEventById: mocks.event }));
vi.mock("@/lib/db", () => ({ getDb: mocks.getDb }));
vi.mock("@/lib/request-rate-limits", () => ({
  consumeRateLimit: mocks.consumeRateLimit,
  rateLimitResponse: (retryAfterSeconds: number) =>
    Response.json(
      { error: "Muitas tentativas. Tente novamente mais tarde." },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
    ),
  requestRateLimitPolicies: {
    guestLinkAddress: {
      action: "guest-link-address",
      maximum: 30,
      windowMs: 900000,
    },
  },
  trustedClientAddress: mocks.trustedClientAddress,
}));

import { POST } from "./route";

const eventId = "507f1f77bcf86cd799439011";
const guestId = "507f1f77bcf86cd799439012";
const request = (body: unknown) =>
  new Request("http://localhost/api/guest-access", {
    method: "POST",
    body: JSON.stringify(body),
  });

describe("guest email access endpoint", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.GUEST_SESSION_SECRET = "test-only-session-secret";
    mocks.event.mockResolvedValue({ _id: eventId });
    mocks.getDb.mockResolvedValue({
      collection: () => ({ findOne: mocks.findGuest }),
    });
    mocks.findGuest.mockResolvedValue({
      _id: new ObjectId(guestId),
      eventId: new ObjectId(eventId),
      fullName: "Ana",
    });
    mocks.trustedClientAddress.mockReturnValue("203.0.113.8");
    mocks.consumeRateLimit.mockResolvedValue({
      allowed: true,
      retryAfterSeconds: 60,
    });
  });

  it("requires an event and valid email", async () => {
    expect((await POST(request({ email: "ana@example.com" }))).status).toBe(
      400,
    );
    expect((await POST(request({ eventId, email: "not-an-email" }))).status).toBe(
      400,
    );
  });

  it("creates an RSVP-scoped session and returns no private fields", async () => {
    const response = await POST(
      request({ eventId, email: " Ana@Example.com ", voterId: "spoofed" }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ fullName: "Ana" });
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("set-cookie")).toContain("guest_session=");
    expect(mocks.findGuest).toHaveBeenCalledWith({
      eventId: new ObjectId(eventId),
      normalizedEmail: "ana@example.com",
      status: { $ne: "cancelled" },
    });
    expect(mocks.consumeRateLimit).toHaveBeenCalledOnce();
  });

  it("blocks over-limit access attempts before looking up the RSVP", async () => {
    mocks.consumeRateLimit.mockResolvedValue({
      allowed: false,
      retryAfterSeconds: 54,
    });

    const response = await POST(request({ eventId, email: "ana@example.com" }));

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("54");
    expect(mocks.findGuest).not.toHaveBeenCalled();
  });

  it("fails closed when the trusted proxy address is unavailable", async () => {
    mocks.trustedClientAddress.mockReturnValue(null);

    const response = await POST(request({ eventId, email: "ana@example.com" }));

    expect(response.status).toBe(503);
    expect(mocks.consumeRateLimit).not.toHaveBeenCalled();
    expect(mocks.findGuest).not.toHaveBeenCalled();
  });

  it("rejects an email that has no active RSVP", async () => {
    mocks.findGuest.mockResolvedValue(null);
    expect(
      (await POST(request({ eventId, email: "ana@example.com" }))).status,
    ).toBe(404);
  });

  it("handles missing events and database failures", async () => {
    mocks.event.mockResolvedValue(null);
    expect(
      (await POST(request({ eventId, email: "ana@example.com" }))).status,
    ).toBe(404);

    mocks.event.mockResolvedValue({ _id: eventId });
    mocks.getDb.mockRejectedValue(new Error("private database detail"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await POST(
      request({ eventId, email: "ana@example.com" }),
    );
    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain(
      "private database detail",
    );
    log.mockRestore();
  });
});
