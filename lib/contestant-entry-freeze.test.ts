import { describe, expect, it, vi } from "vitest";
import { ObjectId, type Db } from "mongodb";
import type { ContestantEntryDocument } from "@/lib/contestant-entries";
import {
  entryCanVoteForCategory,
  freezeContestantEntries,
  isCompleteContestantEntry,
  reopenContestantEntries,
} from "@/lib/contestant-entry-freeze";

const eventId = new ObjectId("507f1f77bcf86cd799439011");
const categoryId = new ObjectId("507f1f77bcf86cd799439012");
const ownerRsvpId = new ObjectId("507f1f77bcf86cd799439013");
const otherRsvpId = new ObjectId("507f1f77bcf86cd799439014");
const now = new Date("2026-10-09T12:00:00.000Z");

function readyEntry(
  overrides: Partial<ContestantEntryDocument> = {},
): ContestantEntryDocument {
  return {
    _id: new ObjectId("507f1f77bcf86cd799439015"),
    eventId,
    categoryId,
    entryType: "individual",
    displayName: "Ana Freitas",
    status: "ready",
    ownerRsvpId,
    contestPhoto: {
      assetId: "asset-1",
      publicId: `contest-photos/${eventId.toString()}/asset-1`,
      format: "png",
      bytes: 100,
      width: 100,
      height: 100,
      uploadedAt: now,
      consentAt: now,
      consentByRsvpId: ownerRsvpId.toString(),
    },
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("contestant entry readiness and freeze", () => {
  const categories = new Map([[categoryId.toString(), "all" as const]]);

  it("requires category, name, photo, and consent from the owner or guardian", () => {
    expect(isCompleteContestantEntry(readyEntry(), categories)).toBe(true);
    expect(
      isCompleteContestantEntry(
        readyEntry({ contestPhoto: undefined }),
        categories,
      ),
    ).toBe(false);
    expect(
      isCompleteContestantEntry(
        readyEntry({
          contestPhoto: {
            ...readyEntry().contestPhoto!,
            consentByRsvpId: otherRsvpId.toString(),
          },
        }),
        categories,
      ),
    ).toBe(false);
    expect(
      isCompleteContestantEntry(
        readyEntry({ categoryId: new ObjectId() }),
        categories,
      ),
    ).toBe(false);
    expect(
      isCompleteContestantEntry(
        readyEntry({
          contestPhoto: {
            ...readyEntry().contestPhoto!,
            publicId: "contest-photos/another-edition/asset-1",
          },
        }),
        categories,
      ),
    ).toBe(false);
  });

  it("matches junior and group entries to their eligible category types", () => {
    const juniorCategories = new Map([
      [categoryId.toString(), "junior" as const],
    ]);
    expect(
      isCompleteContestantEntry(
        readyEntry({
          entryType: "junior",
          ownerRsvpId: undefined,
          guardianRsvpId: ownerRsvpId,
          contestPhoto: {
            ...readyEntry().contestPhoto!,
            consentByRsvpId: ownerRsvpId.toString(),
          },
        }),
        juniorCategories,
      ),
    ).toBe(true);
    expect(
      isCompleteContestantEntry(
        readyEntry({ entryType: "individual" }),
        juniorCategories,
      ),
    ).toBe(false);
  });

  it("freezes complete entries and preserves incomplete drafts", async () => {
    const complete = readyEntry();
    const incompleteReady = readyEntry({
      _id: new ObjectId("507f1f77bcf86cd799439016"),
      contestPhoto: undefined,
    });
    const draft = readyEntry({
      _id: new ObjectId("507f1f77bcf86cd799439017"),
      status: "draft",
      contestPhoto: undefined,
    });
    const withdrawn = readyEntry({
      _id: new ObjectId("507f1f77bcf86cd799439018"),
      status: "withdrawn",
    });
    const updateMany = vi.fn().mockResolvedValue({ modifiedCount: 1 });
    const db = {
      collection: (name: string) =>
        name === "categories"
          ? {
              find: () => ({
                toArray: async () => [{ _id: categoryId, eligibility: "all" }],
              }),
            }
          : {
              find: () => ({
                toArray: async () => [
                  complete,
                  incompleteReady,
                  draft,
                  withdrawn,
                ],
              }),
              updateMany,
            },
    } as unknown as Db;
    const session = {} as never;

    await freezeContestantEntries(db, eventId, session, now);

    expect(updateMany).toHaveBeenCalledTimes(2);
    expect(updateMany).toHaveBeenNthCalledWith(
      1,
      {
        eventId,
        _id: { $in: [complete._id] },
        status: { $in: ["draft", "ready"] },
      },
      { $set: { status: "locked", updatedAt: now } },
      { session },
    );
    expect(updateMany).toHaveBeenNthCalledWith(
      2,
      {
        eventId,
        _id: { $in: [incompleteReady._id] },
        status: "ready",
      },
      { $set: { status: "draft", updatedAt: now } },
      { session },
    );
  });

  it("unfreezes only previously locked entries when registration reopens", async () => {
    const updateMany = vi.fn().mockResolvedValue({ modifiedCount: 1 });
    const db = {
      collection: () => ({ updateMany }),
    } as unknown as Db;
    const session = {} as never;

    await reopenContestantEntries(db, eventId, session, now);

    expect(updateMany).toHaveBeenCalledWith(
      { eventId, status: "locked" },
      { $set: { status: "ready", updatedAt: now } },
      { session },
    );
  });

  it("allows guardian and group-owner votes but blocks individual self-votes", () => {
    const category = {
      _id: categoryId.toString(),
      eventId: eventId.toString(),
      eligibility: "all" as const,
    };
    expect(
      entryCanVoteForCategory(
        readyEntry({ status: "locked" }),
        category,
        ownerRsvpId,
      ),
    ).toBe(false);
    expect(
      entryCanVoteForCategory(
        readyEntry({ status: "locked" }),
        category,
        otherRsvpId,
      ),
    ).toBe(true);
    expect(
      entryCanVoteForCategory(
        readyEntry({
          status: "locked",
          entryType: "junior",
          ownerRsvpId: undefined,
          guardianRsvpId: ownerRsvpId,
        }),
        category,
        ownerRsvpId,
      ),
    ).toBe(true);
    expect(
      entryCanVoteForCategory(
        readyEntry({ status: "locked", entryType: "group" }),
        category,
        ownerRsvpId,
      ),
    ).toBe(true);
  });
});
