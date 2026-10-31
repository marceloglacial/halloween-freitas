import { describe, expect, it, vi } from "vitest";
import { ObjectId } from "mongodb";
import {
  getContestantEntryForPhoto,
  removeContestPhotoForGuest,
  saveContestPhotoForAdmin,
  saveContestPhotoForGuest,
} from "@/lib/contestant-photo-writes";

const eventId = new ObjectId("507f1f77bcf86cd799439011");
const entryId = new ObjectId("507f1f77bcf86cd799439012");
const rsvpId = new ObjectId("507f1f77bcf86cd799439013");
const now = new Date("2026-10-01T00:00:00.000Z");
const photo = {
  assetId: "new-asset",
  publicId: "contest-photos/new",
  format: "png" as const,
  bytes: 1024,
  width: 800,
  height: 600,
  uploadedAt: now,
  consentAt: now,
  consentByRsvpId: rsvpId.toString(),
};

describe("contestant photo ownership and persistence", () => {
  it("looks up entries only within the selected event and RSVP ownership", async () => {
    const findOne = vi.fn().mockResolvedValue({ _id: entryId });
    const db = { collection: () => ({ findOne }) };

    await getContestantEntryForPhoto(db as never, eventId, entryId, rsvpId);

    expect(findOne).toHaveBeenCalledWith(
      {
        _id: entryId,
        eventId,
        ownerRsvpId: rsvpId,
      },
      {
        projection: {
          _id: 1,
          eventId: 1,
          ownerRsvpId: 1,
          entryType: 1,
          status: 1,
          contestPhoto: 1,
        },
      },
    );
  });

  it("atomically saves a replacement and queues only the old asset", async () => {
    const eventsUpdate = vi.fn().mockResolvedValue({ matchedCount: 1 });
    const entryFind = vi.fn().mockResolvedValue({
      _id: entryId,
      status: "draft",
      contestPhoto: {
        assetId: "old-asset",
        publicId: "contest-photos/old",
      },
    });
    const entryUpdate = vi.fn().mockResolvedValue({ matchedCount: 1 });
    const cleanupUpdate = vi.fn().mockResolvedValue({ upsertedCount: 1 });
    const db = {
      collection: (name: string) => {
        if (name === "events") return { updateOne: eventsUpdate };
        if (name === "contestants") {
          return { findOne: entryFind, updateOne: entryUpdate };
        }
        return { updateOne: cleanupUpdate };
      },
    };
    const session = {
      withTransaction: (work: () => Promise<unknown>) => work(),
      endSession: vi.fn(),
    };
    const client = { startSession: () => session };

    await expect(
      saveContestPhotoForGuest(client as never, db as never, {
        eventId,
        entryId,
        rsvpId,
        photo,
        now,
      }),
    ).resolves.toEqual({
      assetId: "old-asset",
      publicId: "contest-photos/old",
    });

    expect(eventsUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: eventId,
        status: "active",
        votingStatus: "not_started",
      }),
      expect.any(Object),
      { session },
    );
    expect(entryUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: entryId,
        eventId,
        ownerRsvpId: rsvpId,
        "contestPhoto.assetId": "old-asset",
      }),
      { $set: { contestPhoto: photo, status: "ready", updatedAt: now } },
      { session },
    );
    expect(cleanupUpdate).toHaveBeenCalledWith(
      { _id: "old-asset" },
      {
        $setOnInsert: {
          _id: "old-asset",
          eventId,
          publicId: "contest-photos/old",
          attempts: 0,
          nextAttemptAt: now,
        },
      },
      { upsert: true, session },
    );
    expect(session.endSession).toHaveBeenCalledOnce();
  });

  it("does not update an entry after the event cutoff closes", async () => {
    const eventsUpdate = vi.fn().mockResolvedValue({ matchedCount: 0 });
    const entryFind = vi.fn();
    const db = {
      collection: (name: string) =>
        name === "events"
          ? { updateOne: eventsUpdate }
          : { findOne: entryFind, updateOne: vi.fn() },
    };
    const session = {
      withTransaction: async (work: () => Promise<unknown>) => work(),
      endSession: vi.fn(),
    };
    const client = { startSession: () => session };

    await expect(
      saveContestPhotoForGuest(client as never, db as never, {
        eventId,
        entryId,
        rsvpId,
        photo,
        now,
      }),
    ).rejects.toThrow("CONTEST_ENTRY_CLOSED");
    expect(entryFind).not.toHaveBeenCalled();
    expect(session.endSession).toHaveBeenCalledOnce();
  });

  it("removes an individual participation when its only qualifying photo is deleted", async () => {
    const eventsUpdate = vi.fn().mockResolvedValue({ matchedCount: 1 });
    const entryFind = vi.fn().mockResolvedValue({
      _id: entryId,
      status: "ready",
      entryType: "individual",
      contestPhoto: photo,
    });
    const entryDelete = vi.fn().mockResolvedValue({ deletedCount: 1 });
    const cleanupUpdate = vi.fn().mockResolvedValue({ upsertedCount: 1 });
    const db = {
      collection: (name: string) => {
        if (name === "events") return { updateOne: eventsUpdate };
        if (name === "contestants") {
          return { findOne: entryFind, deleteOne: entryDelete };
        }
        return { updateOne: cleanupUpdate };
      },
    };
    const session = {
      withTransaction: (work: () => Promise<unknown>) => work(),
      endSession: vi.fn(),
    };

    await expect(
      removeContestPhotoForGuest(
        { startSession: () => session } as never,
        db as never,
        { eventId, entryId, rsvpId, now },
      ),
    ).resolves.toEqual(photo);
    expect(entryDelete).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: entryId,
        eventId,
        ownerRsvpId: rsvpId,
        "contestPhoto.assetId": photo.assetId,
      }),
      { session },
    );
    expect(cleanupUpdate).toHaveBeenCalled();
  });

  it("audits admin photo corrections and preserves the original consent", async () => {
    const previousPhoto = {
      assetId: "old-asset",
      publicId: "contest-photos/old",
      consentAt: new Date("2026-09-10T00:00:00.000Z"),
      consentByRsvpId: rsvpId.toString(),
    };
    const entryUpdate = vi.fn().mockResolvedValue({ matchedCount: 1 });
    const auditInsert = vi
      .fn()
      .mockResolvedValue({ insertedId: new ObjectId() });
    const cleanupUpdate = vi.fn().mockResolvedValue({ upsertedCount: 1 });
    const db = {
      collection: (name: string) => {
        if (name === "contestants") {
          return {
            findOne: vi.fn().mockResolvedValue({
              _id: entryId,
              status: "locked",
              ownerRsvpId: rsvpId,
              contestPhoto: previousPhoto,
            }),
            updateOne: entryUpdate,
          };
        }
        if (name === "adminAudits") return { insertOne: auditInsert };
        return { updateOne: cleanupUpdate };
      },
    };
    const session = {
      withTransaction: (work: () => Promise<unknown>) => work(),
      endSession: vi.fn(),
    };
    const client = { startSession: () => session };

    await expect(
      saveContestPhotoForAdmin(client as never, db as never, {
        eventId,
        entryId,
        actorId: "admin-clerk-id",
        photo,
        now,
      }),
    ).resolves.toEqual(previousPhoto);

    expect(entryUpdate).toHaveBeenCalledWith(
      {
        _id: entryId,
        eventId,
        "contestPhoto.assetId": "old-asset",
      },
      {
        $set: {
          contestPhoto: {
            ...photo,
            consentAt: previousPhoto.consentAt,
            consentByRsvpId: previousPhoto.consentByRsvpId,
          },
          updatedAt: now,
        },
      },
      { session },
    );
    expect(auditInsert).toHaveBeenCalledWith(
      {
        eventId,
        clerkUserId: "admin-clerk-id",
        action: "contest_photo_replaced",
        targetType: "contestant",
        targetId: entryId,
        at: now,
        changes: { beforeAssetId: "old-asset", afterAssetId: "new-asset" },
      },
      { session },
    );
    expect(cleanupUpdate).toHaveBeenCalledWith(
      { _id: "old-asset" },
      expect.any(Object),
      { upsert: true, session },
    );
  });
});
