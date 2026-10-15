import { describe, expect, it } from "vitest";
import { resolveAdminEvent } from "@/lib/admin-event-selection";

const events = [
  { year: 2026, title: "Halloween 2026", status: "active" },
  { year: 2025, title: "Halloween 2025", status: "archived" },
] as HalloweenEvent[];

describe("admin event selection", () => {
  it("selects the explicitly requested edition", () => {
    expect(resolveAdminEvent(events, "2025")).toEqual({
      event: events[1],
      reason: "selected",
    });
  });

  it("falls back to the active edition for an unknown year", () => {
    expect(resolveAdminEvent(events, "1900")).toEqual({
      event: events[0],
      reason: "invalid-year",
    });
  });

  it("uses the latest archived edition when there is no active edition", () => {
    const archivedEvents = [...events]
      .map((event) => ({ ...event, status: "archived" as const }))
      .reverse();
    expect(resolveAdminEvent(archivedEvents)).toEqual({
      event: archivedEvents[1],
      reason: "latest-fallback",
    });
  });

  it("reports an explicit empty state when no editions exist", () => {
    expect(resolveAdminEvent([])).toEqual({ event: null, reason: "no-events" });
  });
});
