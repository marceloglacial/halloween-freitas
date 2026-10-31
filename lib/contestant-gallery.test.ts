import { ObjectId } from "mongodb";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { db } = vi.hoisted(() => ({ db: { collection: vi.fn() } }));

vi.mock("@/lib/db", () => ({ getDb: vi.fn(async () => db) }));

import {
  getPublicContestGalleryEntries,
  getPublicContestGalleryPhoto,
} from "@/lib/contestant-gallery";

const eventId = new ObjectId("507f1f77bcf86cd799439011");
const categoryId = new ObjectId("507f1f77bcf86cd799439012");
const ownerId = new ObjectId("507f1f77bcf86cd799439013");
const validEntryId = new ObjectId("507f1f77bcf86cd799439014");
const now = new Date("2026-10-01T00:00:00.000Z");

function entry(overrides: Record<string, unknown> = {}) {
  return {
    _id: validEntryId,
    eventId,
    categoryId,
    entryType: "group",
    displayName: "Família Freitas",
    status: "ready",
    ownerRsvpId: ownerId,
    contestPhoto: {
      assetId: "private-asset-id",
      publicId: `contest-photos/${eventId}/secret-photo-id`,
      format: "webp",
      width: 800,
      height: 1200,
      uploadedAt: now,
      consentAt: now,
      consentByRsvpId: ownerId.toString(),
    },
    ...overrides,
  };
}

describe("public contestant photo gallery queries", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns only complete, consented entries owned in the requested edition", async () => {
    const category = {
      _id: categoryId,
      eventId,
      title: "Fantasia em grupo",
      icon: "👯",
      eligibility: "group",
    };
    const find = vi
      .fn()
      .mockImplementationOnce(() => ({ toArray: async () => [category] }))
      .mockImplementationOnce(() => ({
        sort: () => ({
          toArray: async () => [
            entry(),
            entry({
              _id: new ObjectId("507f1f77bcf86cd799439015"),
              displayName: "Draft group",
              status: "draft",
            }),
            entry({
              _id: new ObjectId("507f1f77bcf86cd799439016"),
              displayName: "Unconsented group",
              contestPhoto: {
                ...entry().contestPhoto,
                consentByRsvpId: new ObjectId().toString(),
              },
            }),
            entry({
              _id: new ObjectId("507f1f77bcf86cd799439017"),
              displayName: "Wrong category",
              categoryId: new ObjectId("507f1f77bcf86cd799439018"),
            }),
            entry({
              _id: new ObjectId("507f1f77bcf86cd799439019"),
              displayName: "Other edition owner",
              ownerRsvpId: new ObjectId("507f1f77bcf86cd799439020"),
            }),
          ],
        }),
      }))
      .mockImplementationOnce(() => ({
        toArray: async () => [{ _id: ownerId }],
      }));
    db.collection.mockImplementation(() => ({ find }));

    const result = await getPublicContestGalleryEntries(eventId.toString());

    expect(result).toEqual([
      {
        _id: validEntryId.toString(),
        displayName: "Família Freitas",
        entryType: "group",
        categoryTitle: "Fantasia em grupo",
        categoryIcon: "👯",
        width: 800,
        height: 1200,
      },
    ]);
    expect(JSON.stringify(result)).not.toContain("secret-photo-id");
    expect(JSON.stringify(result)).not.toContain("private-asset-id");
    expect(find.mock.calls[1][0]).toMatchObject({
      eventId,
      status: { $in: ["ready", "locked"] },
    });
  });

  it("returns an empty list for malformed event IDs without querying data", async () => {
    expect(await getPublicContestGalleryEntries("not-an-object-id")).toEqual(
      [],
    );
    expect(db.collection).not.toHaveBeenCalled();
  });

  it("rechecks entry, category, photo consent, and same-edition ownership for direct image requests", async () => {
    const findOne = vi
      .fn()
      .mockResolvedValueOnce(entry())
      .mockResolvedValueOnce({
        _id: categoryId,
        eventId,
        title: "Fantasia em grupo",
        eligibility: "group",
      })
      .mockResolvedValueOnce({ _id: ownerId });
    db.collection.mockImplementation(() => ({ findOne }));

    const photo = await getPublicContestGalleryPhoto(
      db as never,
      eventId,
      validEntryId,
    );

    expect(photo).toEqual({
      publicId: `contest-photos/${eventId}/secret-photo-id`,
      format: "webp",
    });
    expect(findOne.mock.calls[0][0]).toMatchObject({
      _id: validEntryId,
      eventId,
      status: { $in: ["ready", "locked"] },
    });
    expect(findOne.mock.calls[2][0]).toMatchObject({
      _id: ownerId,
      eventId,
    });
  });

  it("does not deliver photos when owner consent is missing or belongs to another RSVP", async () => {
    const findOne = vi
      .fn()
      .mockResolvedValueOnce(
        entry({
          contestPhoto: {
            ...entry().contestPhoto,
            consentByRsvpId: new ObjectId().toString(),
          },
        }),
      )
      .mockResolvedValueOnce({
        _id: categoryId,
        eventId,
        title: "Fantasia em grupo",
        eligibility: "group",
      });
    db.collection.mockImplementation(() => ({ findOne }));

    const photo = await getPublicContestGalleryPhoto(
      db as never,
      eventId,
      validEntryId,
    );

    expect(photo).toBeNull();
    expect(db.collection).toHaveBeenCalledTimes(2);
  });
});
