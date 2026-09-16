import { describe, expect, it } from "vitest";
import { isEligibleCandidate } from "@/lib/voting";

describe("candidate eligibility", () => {
  const candidate = { _id: "candidate", group: false, junior: true };

  it("excludes the voter from every category", () => {
    expect(
      isEligibleCandidate({ eligibility: "all" }, candidate, "candidate"),
    ).toBe(false);
  });

  it("enforces explicit group and junior flags", () => {
    expect(isEligibleCandidate({ eligibility: "group" }, candidate)).toBe(
      false,
    );
    expect(isEligibleCandidate({ eligibility: "junior" }, candidate)).toBe(
      true,
    );
  });
});
