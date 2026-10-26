import { describe, expect, it } from "vitest";
import { isEligibleCandidate } from "@/lib/voting";

describe("candidate eligibility", () => {
  const candidate = { _id: "candidate", group: false };

  it("allows the voter to choose their own contestant entry", () => {
    expect(isEligibleCandidate({ eligibility: "all" }, candidate)).toBe(true);
  });

  it("enforces the explicit group flag", () => {
    expect(isEligibleCandidate({ eligibility: "group" }, candidate)).toBe(
      false,
    );
  });

  it("does not treat an RSVP as a contest entry", () => {
    expect(
      isEligibleCandidate(
        { eligibility: "all" },
        { ...candidate, contestant: false },
      ),
    ).toBe(false);
  });
});
