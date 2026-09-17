import { describe, expect, it } from "vitest";
import { calculateTimeLeft } from "@/util/countdown";

describe("countdown", () => {
  it("uses the supplied render timestamp deterministically", () => {
    const target = "2026-11-01T00:00:00.000Z";
    const snapshot = new Date("2026-10-30T22:58:59.000Z").getTime();
    expect(calculateTimeLeft(target, snapshot)).toEqual({
      days: 1,
      hours: 1,
      minutes: 1,
      seconds: 1,
    });
  });

  it("does not return negative values after the target", () => {
    const target = "2026-11-01T00:00:00.000Z";
    expect(calculateTimeLeft(target, Date.parse(target) + 1)).toEqual({
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
    });
  });
});
