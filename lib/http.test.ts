import { describe, expect, it, vi } from "vitest";
import {
  normalizeEmail,
  normalizeName,
  parseObjectId,
  logServerError,
  readJsonObject,
} from "@/lib/http";

describe("request normalization", () => {
  it("normalizes valid identity fields", () => {
    expect(normalizeEmail("  Guest@Example.COM ")).toBe("guest@example.com");
    expect(normalizeName("  Ana   Freitas ")).toBe("Ana Freitas");
  });

  it("rejects malformed values", () => {
    expect(normalizeEmail("not-an-email")).toBeNull();
    expect(normalizeName(" ")).toBeNull();
    expect(parseObjectId("invalid")).toBeNull();
  });

  it("accepts only JSON objects", async () => {
    expect(
      await readJsonObject(
        new Request("http://localhost", { method: "POST", body: "{" }),
      ),
    ).toBeNull();
    expect(
      await readJsonObject(
        new Request("http://localhost", { method: "POST", body: "[]" }),
      ),
    ).toBeNull();
  });

  it("logs server error metadata without exposing exception messages", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      logServerError(
        "Request failed",
        new Error("private guest@example.com token=secret-value"),
      );

      const logged = JSON.stringify(errorSpy.mock.calls);
      expect(logged).toContain("Request failed");
      expect(logged).toContain("Error");
      expect(logged).not.toContain("guest@example.com");
      expect(logged).not.toContain("secret-value");
    } finally {
      errorSpy.mockRestore();
    }
  });
});
