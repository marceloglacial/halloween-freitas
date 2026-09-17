import { describe, expect, it } from "vitest";
import {
  normalizeEmail,
  normalizeName,
  parseObjectId,
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
});
