import { describe, expect, it } from "vitest";
import { ObjectId } from "mongodb";
import { contestEntryWriteFilter } from "@/lib/contest-entry-writes";

describe("contest entry write guard", () => {
  it("requires an active edition, an open entry state, and the scheduled start", () => {
    const eventId = new ObjectId();
    const now = new Date("2026-09-01T04:00:00.000Z");

    expect(contestEntryWriteFilter(eventId, now)).toEqual({
      _id: eventId,
      status: "active",
      votingStatus: "not_started",
      $and: [
        {
          $or: [
            { contestEntryStatus: "open" },
            { contestEntryStatus: { $exists: false } },
          ],
        },
        {
          $or: [
            { registrationStartsAt: { $lte: now } },
            {
              registrationStartsAt: { $exists: false },
              registrationOpensAt: { $lte: now },
            },
          ],
        },
      ],
    });
  });
});
