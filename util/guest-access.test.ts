import { describe, expect, it } from "vitest";
import { guestReturnPath, guestAccessUrl } from "./guest-access";

const eventId = "507f1f77bcf86cd799439011";
describe("guest return destinations", () => {
  it("retains the requested category and selected event", () => {
    expect(
      guestReturnPath(
        "/votacao/categories/507f1f77bcf86cd799439012?eventId=other",
        eventId,
      ),
    ).toBe(`/votacao/categories/507f1f77bcf86cd799439012?eventId=${eventId}`);
    expect(
      new URL(guestAccessUrl(eventId), "http://localhost").searchParams.get(
        "eventId",
      ),
    ).toBe(eventId);
  });
  it.each([
    "https://evil.test",
    "//evil.test",
    "/\\evil.test",
    "/acesso",
    "/dashboard",
    "/votacao/categories/%2e%2e",
    "/votacao/categories?redirect_url=https://evil.test",
    null,
  ])("uses a safe default for %s", (path) => {
    expect(guestReturnPath(path, eventId)).toBe(
      `/votacao/categories?eventId=${eventId}`,
    );
  });
});
