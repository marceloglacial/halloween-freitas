import { describe, expect, it, vi } from "vitest";
import { ObjectId } from "mongodb";
import {
  enqueuePartyPhotoCleanup,
  getPartyAlbumForAdmin,
  getPartyPhotosForGuest,
  PartyAlbumWriteError,
  removePartyPhoto,
  retryPartyPhotoCleanup,
  savePartyPhoto,
  setPartyAlbumPublication,
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
    expect(photoFindOne).toHaveBeenNthCalledWith(
      1,
      {
        eventId,
        assetId: "still-used",
        removedAt: { $exists: false },
      },
      { projection: { _id: 1 } },
    );
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

it("loads retained admin photos only for the selected edition", async () => {
  const toArray = vi.fn().mockResolvedValue([]);
  const sort = vi.fn(() => ({ toArray }));
  const find = vi.fn(() => ({ sort }));
  const findOne = vi.fn().mockResolvedValue(null);
  const db = {
    collection: vi.fn((name: string) =>
      name === "partyAlbums" ? { findOne } : { find },
    ),
  };

  await getPartyAlbumForAdmin(db as never, eventId);

  expect(findOne).toHaveBeenCalledWith({ eventId });
  expect(find).toHaveBeenCalledWith(
    { eventId, removedAt: { $exists: false } },
    expect.objectContaining({
      projection: expect.objectContaining({ publicId: 1 }),
    }),
  );
  expect(sort).toHaveBeenCalledWith({ uploadedAt: -1, _id: -1 });
  expect(db.collection).not.toHaveBeenCalledWith("contestants");
});

it("publishes an edition album and audits the operator atomically", async () => {
  const albumId = new ObjectId();
  const updateOne = vi.fn().mockResolvedValue({ matchedCount: 1 });
  const findOne = vi.fn().mockResolvedValue({
    _id: albumId,
    eventId,
    published: false,
    createdAt: uploadedAt,
  });
  const auditInsert = vi.fn();
  const session = {
    withTransaction: vi.fn(async (operation: () => Promise<void>) =>
      operation(),
    ),
    endSession: vi.fn(),
  };
  const db = {
    collection: vi.fn((name: string) =>
      name === "partyAlbums"
        ? { findOne, updateOne }
        : { insertOne: auditInsert },
    ),
  };

  const publication = await setPartyAlbumPublication(
    { startSession: () => session } as never,
    db as never,
    { eventId, published: true, actorId: "admin-user", now: uploadedAt },
  );

  expect(updateOne).toHaveBeenCalledWith(
    { _id: albumId, eventId, published: false },
    {
      $set: {
        eventId,
        published: true,
        createdAt: uploadedAt,
        updatedAt: uploadedAt,
        updatedBy: "admin-user",
        publishedAt: uploadedAt,
        publishedBy: "admin-user",
      },
    },
    { session },
  );
  expect(auditInsert).toHaveBeenCalledWith(
    expect.objectContaining({
      eventId,
      clerkUserId: "admin-user",
      action: "party_album_published",
      targetType: "party_album",
      at: uploadedAt,
      changes: { published: { from: false, to: true } },
    }),
    { session },
  );
  expect(publication).toMatchObject({
    published: true,
    publishedBy: "admin-user",
  });
  expect(session.endSession).toHaveBeenCalledOnce();
});

it("rejects duplicate publication without recording another audit", async () => {
  const auditInsert = vi.fn();
  const session = {
    withTransaction: vi.fn(async (operation: () => Promise<void>) =>
      operation(),
    ),
    endSession: vi.fn(),
  };
  const db = {
    collection: vi.fn((name: string) =>
      name === "partyAlbums"
        ? {
            findOne: vi.fn().mockResolvedValue({
              _id: new ObjectId(),
              eventId,
              published: true,
              createdAt: uploadedAt,
            }),
          }
        : { insertOne: auditInsert },
    ),
  };

  await expect(
    setPartyAlbumPublication(
      { startSession: () => session } as never,
      db as never,
      { eventId, published: true, actorId: "admin-user", now: uploadedAt },
    ),
  ).rejects.toBeInstanceOf(PartyAlbumWriteError);
  expect(auditInsert).not.toHaveBeenCalled();
  expect(session.endSession).toHaveBeenCalledOnce();
});

it("unpublishes the edition album and records the operator", async () => {
  const albumId = new ObjectId();
  const updateOne = vi.fn().mockResolvedValue({ matchedCount: 1 });
  const auditInsert = vi.fn();
  const session = {
    withTransaction: vi.fn(async (operation: () => Promise<void>) =>
      operation(),
    ),
    endSession: vi.fn(),
  };
  const now = new Date(uploadedAt.getTime() + 60_000);
  const db = {
    collection: vi.fn((name: string) =>
      name === "partyAlbums"
        ? {
            findOne: vi.fn().mockResolvedValue({
              _id: albumId,
              eventId,
              published: true,
              createdAt: uploadedAt,
              publishedAt: uploadedAt,
              publishedBy: "earlier-admin",
            }),
            updateOne,
          }
        : { insertOne: auditInsert },
    ),
  };

  await setPartyAlbumPublication(
    { startSession: () => session } as never,
    db as never,
    { eventId, published: false, actorId: "current-admin", now },
  );

  expect(updateOne).toHaveBeenCalledWith(
    { _id: albumId, eventId, published: true },
    {
      $set: {
        eventId,
        published: false,
        createdAt: uploadedAt,
        updatedAt: now,
        updatedBy: "current-admin",
      },
      $unset: { publishedAt: 1, publishedBy: 1 },
    },
    { session },
  );
  expect(auditInsert).toHaveBeenCalledWith(
    expect.objectContaining({
      action: "party_album_unpublished",
      clerkUserId: "current-admin",
      at: now,
      changes: { published: { from: true, to: false } },
    }),
    { session },
  );
});

it("removes an active photo in its edition, audits, and queues cleanup", async () => {
  const photoId = new ObjectId();
  const photo = { _id: photoId, eventId, uploaderRsvpId: rsvpId, ...asset };
  const photoFindOne = vi.fn().mockResolvedValue(photo);
  const photoUpdateOne = vi.fn().mockResolvedValue({ matchedCount: 1 });
  const cleanupUpdate = vi.fn();
  const auditInsert = vi.fn();
  const session = {
    withTransaction: vi.fn(async (operation: () => Promise<void>) =>
      operation(),
    ),
    endSession: vi.fn(),
  };
  const db = {
    collection: vi.fn((name: string) =>
      name === "partyPhotos"
        ? { findOne: photoFindOne, updateOne: photoUpdateOne }
        : name === "partyPhotoCleanups"
          ? { updateOne: cleanupUpdate }
          : { insertOne: auditInsert },
    ),
  };

  await removePartyPhoto(
    { startSession: () => session } as never,
    db as never,
    { eventId, photoId, actorId: "admin-user", now: uploadedAt },
  );

  expect(photoFindOne).toHaveBeenCalledWith(
    { _id: photoId, eventId, removedAt: { $exists: false } },
    { session },
  );
  expect(photoUpdateOne).toHaveBeenCalledWith(
    {
      _id: photoId,
      eventId,
      removedAt: { $exists: false },
      assetId: asset.assetId,
    },
    { $set: { removedAt: uploadedAt, removedBy: "admin-user" } },
    { session },
  );
  expect(cleanupUpdate).toHaveBeenCalledWith(
    { _id: asset.assetId },
    {
      $setOnInsert: {
        _id: asset.assetId,
        eventId,
        publicId: asset.publicId,
        attempts: 0,
        nextAttemptAt: uploadedAt,
      },
    },
    { upsert: true, session },
  );
  expect(auditInsert).toHaveBeenCalledWith(
    expect.objectContaining({
      action: "party_photo_removed",
      clerkUserId: "admin-user",
      targetId: photoId,
    }),
    { session },
  );
});
