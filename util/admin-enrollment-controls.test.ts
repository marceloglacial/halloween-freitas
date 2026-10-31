import { describe, expect, it } from "vitest";
import { getAdminEnrollmentControls } from "@/util/admin-enrollment-controls";

const event: HalloweenEvent = {
  _id: "507f1f77bcf86cd799439011",
  year: 2026,
  slug: "halloween-2026",
  title: "Halloween 2026",
  timezone: "America/Toronto",
  registrationStartsAt: "2026-09-01T04:00:00.000Z",
  eventStartsAt: "2026-11-01T00:00:00.000Z",
  contestEntryStatus: "open",
  votingStatus: "not_started",
  resultsPublished: false,
  status: "active",
};

describe("admin enrollment controls", () => {
  it("closes RSVP and contestant entry through the same enrollment state", () => {
    const state = getAdminEnrollmentControls(
      { ...event, contestEntryStatus: "closed" },
      new Date("2026-09-15T00:00:00.000Z"),
    );

    expect(state.rsvpState).toBe("closed");
    expect(state.contestantState).toBe("closed");
    expect(state.canChangeContestantMembership).toBe(false);
    expect(state.contestantMembershipDisabledReason).toMatch(
      /inscrições do concurso estão fechadas/i,
    );
  });

  it("does not allow new RSVPs or participant membership after voting opens", () => {
    const state = getAdminEnrollmentControls(
      { ...event, votingStatus: "open" },
      new Date("2026-09-15T00:00:00.000Z"),
    );

    expect(state.rsvpState).toBe("closed");
    expect(state.contestantState).toBe("closed");
    expect(state.canChangeContestantMembership).toBe(false);
    expect(state.contestantMembershipDisabledReason).toMatch(
      /permanentemente/i,
    );
  });

  it("explains why an archived edition cannot accept membership changes", () => {
    const state = getAdminEnrollmentControls(
      { ...event, status: "archived" },
      new Date("2026-09-15T00:00:00.000Z"),
    );

    expect(state.rsvpState).toBe("closed");
    expect(state.contestantState).toBe("closed");
    expect(state.contestantMembershipDisabledReason).toMatch(
      /ative esta edição/i,
    );
  });
});
