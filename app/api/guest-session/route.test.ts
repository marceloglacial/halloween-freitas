import { describe, expect, it } from "vitest";
import { DELETE } from "./route";

describe("guest session logout", () => {
  it("clears the session cookie without caching the response", async () => {
    const response = await DELETE();

    expect(response.status).toBe(204);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("set-cookie")).toContain("guest_session=");
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
  });
});
