import { beforeEach, describe, expect, it } from "vitest";
import {
  deserializeGuestSession,
  serializeGuestSession,
} from "@/lib/auth/guest-session";

describe("guest sessions", () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = "a-secure-test-secret-with-32-characters";
  });

  it("round-trips a valid signed session", () => {
    const payload = {
      userId: "user-id",
      eventId: "event-id",
      fullName: "Ana Freitas",
      exp: Math.floor(Date.now() / 1000) + 60,
    };
    expect(deserializeGuestSession(serializeGuestSession(payload))).toEqual(
      payload,
    );
  });

  it("rejects tampered and expired sessions", () => {
    const expired = serializeGuestSession({
      userId: "user-id",
      eventId: "event-id",
      fullName: "Ana Freitas",
      exp: 1,
    });
    expect(deserializeGuestSession(`${expired}x`)).toBeNull();
    expect(deserializeGuestSession(expired)).toBeNull();
  });
});
