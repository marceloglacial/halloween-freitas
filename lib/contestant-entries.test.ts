import { describe, expect, it, vi } from "vitest";
import { ObjectId, type Db } from "mongodb";
import {
  contestantEntriesForRsvpQuery,
  contestantOwnership,
  createContestantEntry,
  isContestantEntryType,
  requireContestantRsvpInEvent,
  serializePublicContestantEntry,
} from "@/lib/contestant-entries";

const eventId = new ObjectId("507f1f77bcf86cd799439011");
const categoryId = new ObjectId("507f1f77bcf86cd799439012");
const rsvpId = new ObjectId("507f1f77bcf86cd799439013");

describe("contestant entry schema and ownership", () => {
  it("accepts only the canonical contestant entry types", () => {
    expect(isContestantEntryType("individual")).toBe(true);
    expect(isContestantEntryType("junior")).toBe(true);
    expect(isContestantEntryType("group")).toBe(true);
    expect(isContestantEntryType("adult")).toBe(false);
  });

  it("assigns adult RSVP ownership to individual and group entries", () => {
    for (const entryType of ["individual", "group"] as const) {
      expect(contestantOwnership(entryType, rsvpId.toString())).toEqual({
        ownerRsvpId: rsvpId,
      });
    }
  });

  it("assigns junior entries to a guardian RSVP", () => {
    expect(contestantOwnership("junior", rsvpId.toString())).toEqual({
      guardianRsvpId: rsvpId,
    });
  });

  it("creates new entries as drafts with stable IDs and normalized names", () => {
    const now = new Date("2026-10-09T12:00:00.000Z");
    const entry = createContestantEntry(
      {
        eventId: eventId.toString(),
        categoryId: categoryId.toString(),
        entryType: "junior",
        rsvpId: rsvpId.toString(),
        displayName: "  Ana   Freitas ",
      },
      now,
    );

    expect(entry).toMatchObject({
      eventId,
      categoryId,
      entryType: "junior",
      guardianRsvpId: rsvpId,
      displayName: "Ana Freitas",
      status: "draft",
      createdAt: now,
      updatedAt: now,
    });
    expect(entry._id).toBeInstanceOf(ObjectId);
    expect(entry).not.toHaveProperty("ownerRsvpId");
  });

  it("rejects malformed IDs, names, and entry types", () => {
    expect(() =>
      createContestantEntry({
        eventId: "bad",
        categoryId: categoryId.toString(),
        entryType: "individual",
        rsvpId: rsvpId.toString(),
        displayName: "Ana",
      }),
    ).toThrow("INVALID_CONTESTANT_ENTRY");
    expect(() =>
      createContestantEntry({
        eventId: eventId.toString(),
        categoryId: categoryId.toString(),
        entryType: "unknown",
        rsvpId: rsvpId.toString(),
        displayName: "Ana",
      }),
    ).toThrow("INVALID_CONTESTANT_ENTRY");
    expect(() => contestantOwnership("individual", "bad")).toThrow(
      "INVALID_CONTESTANT_OWNER",
    );
  });

  it("scopes owner and guardian lookups to the selected event", () => {
    expect(
      contestantEntriesForRsvpQuery(eventId.toString(), rsvpId.toString()),
    ).toEqual({
      eventId,
      $or: [{ ownerRsvpId: rsvpId }, { guardianRsvpId: rsvpId }],
    });
    expect(() => contestantEntriesForRsvpQuery("bad", rsvpId)).toThrow(
      "INVALID_CONTESTANT_OWNERSHIP_QUERY",
    );
  });

  it("requires an active RSVP reference from the same event", async () => {
    const findOne = vi.fn().mockResolvedValue({ _id: rsvpId });
    const db = {
      collection: vi.fn(() => ({ findOne })),
    } as unknown as Db;

    await expect(
      requireContestantRsvpInEvent(db, eventId.toString(), rsvpId.toString()),
    ).resolves.toEqual(rsvpId);
    expect(findOne).toHaveBeenCalledWith(
      {
        _id: rsvpId,
        eventId,
        status: { $ne: "cancelled" },
      },
      { projection: { _id: 1 } },
    );

    findOne.mockResolvedValue(null);
    await expect(
      requireContestantRsvpInEvent(db, eventId.toString(), rsvpId.toString()),
    ).rejects.toThrow("CONTESTANT_RSVP_NOT_FOUND_FOR_EVENT");
  });

  it("keeps drafts and withdrawn entries out of public candidate output", () => {
    const entry = createContestantEntry({
      eventId: eventId.toString(),
      categoryId: categoryId.toString(),
      entryType: "group",
      rsvpId: rsvpId.toString(),
      displayName: "The Freitas",
    });

    expect(serializePublicContestantEntry(entry)).toBeNull();
    expect(
      serializePublicContestantEntry({ ...entry, status: "withdrawn" }),
    ).toBeNull();
    expect(
      serializePublicContestantEntry({ ...entry, status: "ready" }),
    ).toEqual({
      _id: entry._id.toString(),
      eventId: eventId.toString(),
      categoryId: categoryId.toString(),
      entryType: "group",
      displayName: "The Freitas",
    });
  });
});
