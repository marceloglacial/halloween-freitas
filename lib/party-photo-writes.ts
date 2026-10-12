import { ObjectId, type Db, type MongoClient } from "mongodb";
import type { PartyPhotoAsset, PartyPhotoFormat } from "@/lib/party-photos";

export type PartyPhotoDocument = PartyPhotoAsset & {
  _id: ObjectId;
  eventId: ObjectId;
  uploaderRsvpId: ObjectId;
};

type PartyAlbumDocument = {
  _id?: ObjectId;
  eventId: ObjectId;
  published: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type PartyPhotoCleanupDocument = {
  _id: string;
  eventId: ObjectId;
  publicId: string;
  attempts: number;
  nextAttemptAt: Date;
  lastErrorCode?: string;
};

export async function savePartyPhoto(
  client: MongoClient,
  db: Db,
  input: {
    eventId: ObjectId;
    uploaderRsvpId: ObjectId;
    asset: PartyPhotoAsset;
  },
) {
  const session = client.startSession();
  const photoId = new ObjectId();
  const photo: PartyPhotoDocument = {
    _id: photoId,
    eventId: input.eventId,
    uploaderRsvpId: input.uploaderRsvpId,
    ...input.asset,
  };

  try {
    await session.withTransaction(async () => {
      const now = input.asset.uploadedAt;
      await db.collection<PartyAlbumDocument>("partyAlbums").updateOne(
        { eventId: input.eventId },
        {
          $setOnInsert: {
            eventId: input.eventId,
            published: false,
            createdAt: now,
          },
          $set: { updatedAt: now },
        },
        { upsert: true, session },
      );
      await db.collection<PartyPhotoDocument>("partyPhotos").insertOne(photo, {
        session,
      });
    });
  } finally {
    await session.endSession();
  }

  return photo;
}

export async function getPartyPhotosForGuest(
  db: Db,
  eventId: ObjectId,
  uploaderRsvpId: ObjectId,
) {
  return db
    .collection<PartyPhotoDocument>("partyPhotos")
    .find({ eventId, uploaderRsvpId, removedAt: { $exists: false } })
    .sort({ uploadedAt: -1, _id: -1 })
    .limit(100)
    .toArray();
}

export async function enqueuePartyPhotoCleanup(
  db: Db,
  job: { eventId: ObjectId; assetId: string; publicId: string; now: Date },
) {
  const collection =
    db.collection<PartyPhotoCleanupDocument>("partyPhotoCleanups");
  await collection.updateOne(
    { _id: job.assetId },
    {
      $setOnInsert: {
        _id: job.assetId,
        eventId: job.eventId,
        publicId: job.publicId,
        attempts: 0,
        nextAttemptAt: job.now,
      },
    },
    { upsert: true },
  );
}

export async function retryPartyPhotoCleanup(
  db: Db,
  eventId: ObjectId,
  deleteAsset: (publicId: string) => Promise<unknown>,
  now = new Date(),
) {
  const collection =
    db.collection<PartyPhotoCleanupDocument>("partyPhotoCleanups");
  const jobs = await collection
    .find({ eventId, nextAttemptAt: { $lte: now } })
    .sort({ nextAttemptAt: 1, _id: 1 })
    .limit(10)
    .toArray();

  for (const job of jobs) {
    const stillReferenced = await db
      .collection<PartyPhotoDocument>("partyPhotos")
      .findOne({ eventId, assetId: job._id }, { projection: { _id: 1 } });
    if (stillReferenced) {
      await collection.updateOne(
        { _id: job._id, eventId },
        {
          $inc: { attempts: 1 },
          $set: {
            lastErrorCode: "ASSET_STILL_REFERENCED",
            nextAttemptAt: new Date(now.getTime() + 60 * 60 * 1000),
          },
        },
      );
      continue;
    }

    try {
      await deleteAsset(job.publicId);
      await collection.deleteOne({ _id: job._id, eventId });
    } catch {
      const attempts = job.attempts + 1;
      await collection.updateOne(
        { _id: job._id, eventId },
        {
          $inc: { attempts: 1 },
          $set: {
            lastErrorCode: "CLOUDINARY_DELETE_FAILED",
            nextAttemptAt: new Date(
              now.getTime() + Math.min(60 * 60 * 1000, 60_000 * 2 ** attempts),
            ),
          },
        },
      );
    }
  }
}

export function serializePartyPhotoForGuest(
  photo: PartyPhotoDocument,
  previewUrl: string,
) {
  return {
    photoId: photo._id.toString(),
    previewUrl,
    uploadedAt: photo.uploadedAt.toISOString(),
    width: photo.width,
    height: photo.height,
    format: photo.format satisfies PartyPhotoFormat,
  };
}
