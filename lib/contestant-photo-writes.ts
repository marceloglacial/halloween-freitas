import { ObjectId, type Db, type MongoClient } from "mongodb";
import { enqueueContestPhotoCleanup } from "@/lib/contestant-photo-cleanup";
import { claimContestEntryWrite } from "@/lib/contest-entry-writes";
import type { ContestPhotoAsset } from "@/lib/contestant-photos";

export class ContestPhotoWriteError extends Error {
  constructor(
    public status: number,
    public code: string,
  ) {
    super(code);
  }
}

export async function getContestantEntryForPhoto(
  db: Db,
  eventId: ObjectId,
  entryId: ObjectId,
  rsvpId: ObjectId,
) {
  return db.collection("contestants").findOne(
    {
      _id: entryId,
      eventId,
      $or: [{ ownerRsvpId: rsvpId }, { guardianRsvpId: rsvpId }],
    },
    {
      projection: {
        _id: 1,
        eventId: 1,
        ownerRsvpId: 1,
        guardianRsvpId: 1,
        entryType: 1,
        status: 1,
        contestPhoto: 1,
      },
    },
  );
}

export async function saveContestPhotoForGuest(
  client: MongoClient,
  db: Db,
  input: {
    eventId: ObjectId;
    entryId: ObjectId;
    rsvpId: ObjectId;
    photo: ContestPhotoAsset;
    now: Date;
  },
) {
  const session = client.startSession();
  let previousPhoto: ContestPhotoAsset | undefined;

  try {
    await session.withTransaction(async () => {
      await claimContestEntryWrite(db, input.eventId, session, input.now);
      const collection = db.collection("contestants");
      const ownership = {
        _id: input.entryId,
        eventId: input.eventId,
        $or: [{ ownerRsvpId: input.rsvpId }, { guardianRsvpId: input.rsvpId }],
      };
      const entry = await collection.findOne(ownership, {
        projection: { _id: 1, status: 1, contestPhoto: 1 },
        session,
      });
      if (!entry) throw new ContestPhotoWriteError(404, "entry_not_found");
      if (entry.status === "locked" || entry.status === "withdrawn") {
        throw new ContestPhotoWriteError(409, "entry_not_editable");
      }

      previousPhoto = entry.contestPhoto as ContestPhotoAsset | undefined;
      const filter = previousPhoto?.assetId
        ? { ...ownership, "contestPhoto.assetId": previousPhoto.assetId }
        : { ...ownership, contestPhoto: { $exists: false } };
      const update = await collection.updateOne(
        filter,
        {
          $set: {
            contestPhoto: input.photo,
            status: "ready",
            updatedAt: input.now,
          },
        },
        { session },
      );
      if (!update.matchedCount) {
        throw new ContestPhotoWriteError(409, "photo_changed_retry");
      }

      if (previousPhoto?.assetId && previousPhoto.publicId) {
        await enqueueContestPhotoCleanup(
          db,
          {
            eventId: input.eventId,
            assetId: previousPhoto.assetId,
            publicId: previousPhoto.publicId,
            now: input.now,
          },
          session,
        );
      }
    });
  } finally {
    await session.endSession();
  }

  return previousPhoto;
}

export async function saveContestPhotoForAdmin(
  client: MongoClient,
  db: Db,
  input: {
    eventId: ObjectId;
    entryId: ObjectId;
    actorId: string;
    photo: ContestPhotoAsset;
    now: Date;
  },
) {
  const session = client.startSession();
  let previousPhoto: ContestPhotoAsset | undefined;

  try {
    await session.withTransaction(async () => {
      const contestants = db.collection("contestants");
      const entry = await contestants.findOne(
        {
          _id: input.entryId,
          eventId: input.eventId,
          status: { $ne: "withdrawn" },
        },
        { projection: { _id: 1, status: 1, contestPhoto: 1 }, session },
      );
      if (!entry) throw new ContestPhotoWriteError(404, "entry_not_found");
      previousPhoto = entry.contestPhoto as ContestPhotoAsset | undefined;
      if (!previousPhoto?.assetId || !previousPhoto.consentAt) {
        throw new ContestPhotoWriteError(409, "photo_consent_required");
      }

      const filter = {
        _id: input.entryId,
        eventId: input.eventId,
        "contestPhoto.assetId": previousPhoto.assetId,
      };
      const update = await contestants.updateOne(
        filter,
        {
          $set: {
            contestPhoto: {
              ...input.photo,
              consentAt: previousPhoto.consentAt,
              consentByRsvpId: previousPhoto.consentByRsvpId,
            },
            updatedAt: input.now,
          },
        },
        { session },
      );
      if (!update.matchedCount) {
        throw new ContestPhotoWriteError(409, "photo_changed_retry");
      }

      await db.collection("adminAudits").insertOne(
        {
          eventId: input.eventId,
          clerkUserId: input.actorId,
          action: "contest_photo_replaced",
          targetType: "contestant",
          targetId: input.entryId,
          at: input.now,
          changes: {
            beforeAssetId: previousPhoto.assetId,
            afterAssetId: input.photo.assetId,
          },
        },
        { session },
      );

      await enqueueContestPhotoCleanup(
        db,
        {
          eventId: input.eventId,
          assetId: previousPhoto.assetId,
          publicId: previousPhoto.publicId,
          now: input.now,
        },
        session,
      );
    });
  } finally {
    await session.endSession();
  }

  return previousPhoto;
}
