import { describe, expect, it, vi } from "vitest";
import { ObjectId } from "mongodb";

const cloudinaryMocks = vi.hoisted(() => ({
  deleteContestPhotoAsset: vi.fn(),
}));

vi.mock("@/lib/contestant-photos", () => ({
  deleteContestPhotoAsset: cloudinaryMocks.deleteContestPhotoAsset,
}));

import {
  enqueueContestPhotoCleanup,
  retryContestPhotoCleanup,
} from "@/lib/contestant-photo-cleanup";

const eventId = new ObjectId("507f1f77bcf86cd799439011");
const now = new Date("2026-10-01T00:00:00.000Z");

function makeDb(options?: { referenced?: boolean; deleteFailure?: boolean }) {
  const cleanupCollection = {
    updateOne: vi.fn().mockResolvedValue({ upsertedCount: 1 }),
    deleteOne: vi.fn().mockResolvedValue({ deletedCount: 1 }),
    find: vi.fn(() => ({
      sort: () => ({
        limit: () => ({
          toArray: async () => [
            {
              _id: "asset-id",
              eventId,
              publicId: "contest-photos/photo",
              attempts: 0,
              nextAttemptAt: now,
            },
          ],
        }),
      }),
    })),
  };
  const contestantsCollection = {
    findOne: vi
      .fn()
      .mockResolvedValue(options?.referenced ? { _id: new ObjectId() } : null),
  };
  const db = {
    collection: vi.fn((name: string) =>
      name === "contest-photo-cleanups"
        ? cleanupCollection
        : contestantsCollection,
    ),
  };
  return { db, cleanupCollection, contestantsCollection };
}

describe("contest photo cleanup queue", () => {
  it("persists an idempotent event-scoped cleanup job", async () => {
    const { db, cleanupCollection } = makeDb();

    await enqueueContestPhotoCleanup(db as never, {
      eventId,
      assetId: "asset-id",
      publicId: "contest-photos/photo",
      now,
    });

    expect(cleanupCollection.updateOne).toHaveBeenCalledWith(
      { _id: "asset-id" },
      {
        $setOnInsert: {
          _id: "asset-id",
          eventId,
          publicId: "contest-photos/photo",
          attempts: 0,
          nextAttemptAt: now,
        },
      },
      { upsert: true },
    );
  });

  it("never deletes an asset while any contestant references it", async () => {
    const { db, cleanupCollection, contestantsCollection } = makeDb({
      referenced: true,
    });

    await retryContestPhotoCleanup(db as never, eventId, now);

    expect(contestantsCollection.findOne).toHaveBeenCalledWith(
      { "contestPhoto.assetId": "asset-id" },
      { projection: { _id: 1 } },
    );
    expect(cloudinaryMocks.deleteContestPhotoAsset).not.toHaveBeenCalled();
    expect(cleanupCollection.updateOne).toHaveBeenCalledWith(
      { _id: "asset-id" },
      expect.objectContaining({
        $inc: { attempts: 1 },
        $set: expect.objectContaining({
          lastErrorCode: "ASSET_STILL_REFERENCED",
        }),
      }),
    );
  });

  it("deletes unreferenced assets and removes the completed job", async () => {
    const { db, cleanupCollection } = makeDb();
    cloudinaryMocks.deleteContestPhotoAsset.mockResolvedValue({
      deleted: true,
    });

    await retryContestPhotoCleanup(db as never, eventId, now);

    expect(cloudinaryMocks.deleteContestPhotoAsset).toHaveBeenCalledWith(
      "contest-photos/photo",
    );
    expect(cleanupCollection.deleteOne).toHaveBeenCalledWith({
      _id: "asset-id",
      eventId,
    });
  });

  it("keeps failed deletions queued with a retry time", async () => {
    const { db, cleanupCollection } = makeDb();
    cloudinaryMocks.deleteContestPhotoAsset.mockRejectedValue(
      new Error("provider unavailable"),
    );

    await retryContestPhotoCleanup(db as never, eventId, now);

    expect(cleanupCollection.updateOne).toHaveBeenCalledWith(
      { _id: "asset-id", eventId },
      {
        $set: {
          attempts: 1,
          lastErrorCode: "CLOUDINARY_DELETE_FAILED",
          nextAttemptAt: new Date(now.getTime() + 120_000),
        },
      },
    );
    expect(cleanupCollection.deleteOne).not.toHaveBeenCalled();
  });
});
