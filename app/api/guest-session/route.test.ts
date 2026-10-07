import { describe, expect, it } from "vitest";
import { GET, POST, DELETE } from "./route";

describe("retired guest cookie access", () => {
  it.each([GET, POST, DELETE])(
    "never authorizes an email-only or obsolete-cookie session",
    async (handler) => {
      const response = handler();
      expect(response.status).toBe(410);
      expect(response.headers.get("set-cookie")).toBeNull();
    },
  );
});
