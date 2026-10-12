import { describe, expect, it, vi } from "vitest";
import { ObjectId } from "mongodb";
import {
  enqueuePartyPhotoCleanup,
  getPartyPhotosForGuest,
  retryPartyPhotoCleanup,
  savePartyPhoto,
  serializePartyPhotoForGuest,
} from "@/lib/party-photo-writes";

const eventId = new ObjectId("507f1f77bcf86cd799439011");
const rsvpId = new ObjectId("507f1f77bcf86cd799439012");
const uploadedAt = new Date("2026-10-31T20:00:00.000Z");
const asset = {
  assetId: "private-asset-id",
  publicId: "party-photos/event/private-public-id",
  format: "jpg" as const,
  bytes: 2048,
  width: 1200,
  height: 800,
  uploadedAt,
};

describe("party photo persistence", () => {
  it("creates a private album and stores each photo against its event and uploader", async () => {
    const albumUpdate = vi.fn().mockResolvedValue({ matchedCount: 0 });
    const photoInsert = vi.fn().mockResolvedValue({ acknowledged: true });
    const session = {
      withTransaction: vi.fn(async (operation: () => Promise<void>) =>
        operation(),
      ),
      endSession: vi.fn(),
    };
    const db = {
      collection: vi.fn((name: string) =>
        name === "partyAlbums"
          ? { updateOne: albumUpdate }
          : { insertOne: photoInsert },
      ),
    };
    const client = { startSession: vi.fn(() => session) };

    const photo = await savePartyPhoto(client as never, db as never, {
      eventId,
      uploaderRsvpId: rsvpId,
      asset,
    });

    expect(albumUpdate).toHaveBeenCalledWith(
      { eventId },
      {
        $setOnInsert: { eventId, published: false, createdAt: uploadedAt },
        $set: { updatedAt: uploadedAt },
      },
      { upsert: true, session },
    );
    expect(photoInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId,
        uploaderRsvpId: rsvpId,
        ...asset,
      }),
      { session },
    );
    expect(photo._id).toBeInstanceOf(ObjectId);
    expect(session.endSession).toHaveBeenCalledOnce();
    expect(db.collection).not.toHaveBeenCalledWith("contestants");
  });

  it("reads only the uploader's photos in the selected edition", async () => {
    const toArray = vi.fn().mockResolvedValue([]);
    const limit = vi.fn(() => ({ toArray }));
    const sort = vi.fn(() => ({ limit }));
    const find = vi.fn(() => ({ sort }));
    const db = { collection: vi.fn(() => ({ find })) };

    await getPartyPhotosForGuest(db as never, eventId, rsvpId);

    expect(find).toHaveBeenCalledWith({
      eventId,
      uploaderRsvpId: rsvpId,
      removedAt: { $exists: false },
    });
    expect(sort).toHaveBeenCalledWith({
      uploadedAt: -1,
      _id: -1,
    });
    expect(limit).toHaveBeenCalledWith(100);
  });

  it("serializes only safe private-preview fields, not Cloudinary identifiers", () => {
    const serialized = serializePartyPhotoForGuest(
      {
        _id: new ObjectId("507f1f77bcf86cd799439013"),
        eventId,
        uploaderRsvpId: rsvpId,
        ...asset,
      },
      "https://private.example/temporary",
    );

    expect(serialized).toEqual({
      photoId: "507f1f77bcf86cd799439013",
      previewUrl: "https://private.example/temporary",
      uploadedAt: uploadedAt.toISOString(),
      width: 1200,
      height: 800,
      format: "jpg",
    });
    expect(JSON.stringify(serialized)).not.toContain("private-asset-id");
    expect(JSON.stringify(serialized)).not.toContain("private-public-id");
  });

  it("queues an event-scoped cleanup job idempotently", async () => {
    const updateOne = vi.fn();
    const db = { collection: vi.fn(() => ({ updateOne })) };

    await enqueuePartyPhotoCleanup(db as never, {
      eventId,
      assetId: "asset-1",
      publicId: "party-photos/event/photo",
      now: uploadedAt,
    });

    expect(updateOne).toHaveBeenCalledWith(
      { _id: "asset-1" },
      {
        $setOnInsert: {
          _id: "asset-1",
          eventId,
          publicId: "party-photos/event/photo",
          attempts: 0,
          nextAttemptAt: uploadedAt,
        },
      },
      { upsert: true },
    );
  });

  it("never deletes a still-referenced asset and retries failed private deletion", async () => {
    const jobs = [
      {
        _id: "still-used",
        eventId,
        publicId: "party-photos/event/used",
        attempts: 0,
        nextAttemptAt: uploadedAt,
      },
      {
        _id: "orphan",
        eventId,
        publicId: "party-photos/event/orphan",
        attempts: 2,
        nextAttemptAt: uploadedAt,
      },
    ];
    const collection = {
      find: vi.fn(() => ({
        sort: () => ({ limit: () => ({ toArray: async () => jobs }) }),
      })),
      updateOne: vi.fn(),
      deleteOne: vi.fn(),
    };
    const photoFindOne = vi
      .fn()
      .mockResolvedValueOnce({ _id: new ObjectId() })
      .mockResolvedValueOnce(null);
    const db = {
      collection: vi.fn((name: string) =>
        name === "partyPhotoCleanups" ? collection : { findOne: photoFindOne },
      ),
    };
    const deleteAsset = vi.fn().mockRejectedValue(new Error("offline"));

    await retryPartyPhotoCleanup(db as never, eventId, deleteAsset, uploadedAt);

    expect(deleteAsset).toHaveBeenCalledOnce();
    expect(deleteAsset).toHaveBeenCalledWith("party-photos/event/orphan");
    expect(collection.updateOne).toHaveBeenNthCalledWith(
      1,
      { _id: "still-used", eventId },
      {
        $inc: { attempts: 1 },
        $set: {
          lastErrorCode: "ASSET_STILL_REFERENCED",
          nextAttemptAt: new Date(uploadedAt.getTime() + 60 * 60 * 1000),
        },
      },
    );
    expect(collection.updateOne).toHaveBeenNthCalledWith(
      2,
      { _id: "orphan", eventId },
      {
        $inc: { attempts: 1 },
        $set: {
          lastErrorCode: "CLOUDINARY_DELETE_FAILED",
          nextAttemptAt: new Date(uploadedAt.getTime() + 8 * 60_000),
        },
      },
    );
    expect(collection.deleteOne).not.toHaveBeenCalled();
  });
});
