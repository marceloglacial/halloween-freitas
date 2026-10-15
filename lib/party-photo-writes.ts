import {
  ObjectId,
  type ClientSession,
  type Db,
  type MongoClient,
} from "mongodb";
import type { PartyPhotoAsset, PartyPhotoFormat } from "@/lib/party-photos";

export type PartyPhotoDocument = PartyPhotoAsset & {
  _id: ObjectId;
  eventId: ObjectId;
  uploaderRsvpId: ObjectId;
};

type PartyAlbumDocument = {
  _id: ObjectId;
  eventId: ObjectId;
  published: boolean;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  publishedBy?: string;
  updatedBy?: string;
};

export type PublicPartyGalleryPhoto = {
  photoId: string;
  previewUrl: string;
  width: number;
  height: number;
};

export class PartyAlbumWriteError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

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

export async function getPartyAlbumForAdmin(db: Db, eventId: ObjectId) {
  const [album, photos] = await Promise.all([
    db.collection<PartyAlbumDocument>("partyAlbums").findOne({ eventId }),
    db
      .collection<PartyPhotoDocument>("partyPhotos")
      .find(
        { eventId, removedAt: { $exists: false } },
        {
          projection: {
            _id: 1,
            eventId: 1,
            assetId: 1,
            publicId: 1,
            format: 1,
            bytes: 1,
            width: 1,
            height: 1,
            uploadedAt: 1,
          },
        },
      )
      .sort({ uploadedAt: -1, _id: -1 })
      .toArray(),
  ]);

  return { album, photos };
}

export async function getPublicPartyAlbum(db: Db, eventId: ObjectId) {
  const album = await db
    .collection<PartyAlbumDocument>("partyAlbums")
    .findOne({ eventId, published: true }, { projection: { _id: 1 } });

  if (!album) return { published: false as const, photos: [] };

  const photos = await db
    .collection<PartyPhotoDocument>("partyPhotos")
    .find(
      { eventId, removedAt: { $exists: false } },
      {
        projection: {
          _id: 1,
          publicId: 1,
          format: 1,
          width: 1,
          height: 1,
        },
      },
    )
    .sort({ uploadedAt: -1, _id: -1 })
    .toArray();

  return { published: true as const, photos };
}

export async function getPublicPartyPhoto(
  db: Db,
  eventId: ObjectId,
  photoId: ObjectId,
) {
  const album = await db
    .collection<PartyAlbumDocument>("partyAlbums")
    .findOne({ eventId, published: true }, { projection: { _id: 1 } });
  if (!album) return null;

  return db
    .collection<PartyPhotoDocument>("partyPhotos")
    .findOne(
      { _id: photoId, eventId, removedAt: { $exists: false } },
      { projection: { publicId: 1, format: 1 } },
    );
}

export function serializePublicPartyGalleryPhoto(
  photo: Pick<PartyPhotoDocument, "_id" | "width" | "height">,
  eventSlug: string,
): PublicPartyGalleryPhoto {
  return {
    photoId: photo._id.toString(),
    previewUrl: `/api/party-gallery/${photo._id.toString()}?event=${encodeURIComponent(eventSlug)}`,
    width: photo.width,
    height: photo.height,
  };
}

export async function getPublishedPartyAlbumEventIds(db: Db) {
  const albums = await db
    .collection<PartyAlbumDocument>("partyAlbums")
    .find({ published: true }, { projection: { _id: 0, eventId: 1 } })
    .toArray();

  if (albums.length === 0) return new Set<string>();

  const photos = await db
    .collection<PartyPhotoDocument>("partyPhotos")
    .find(
      {
        eventId: { $in: albums.map((album) => album.eventId) },
        removedAt: { $exists: false },
      },
      { projection: { _id: 0, eventId: 1 } },
    )
    .toArray();

  return new Set(photos.map((photo) => photo.eventId.toString()));
}

export async function setPartyAlbumPublication(
  client: MongoClient,
  db: Db,
  input: {
    eventId: ObjectId;
    published: boolean;
    actorId: string;
    now: Date;
  },
) {
  const session = client.startSession();
  let publication: Omit<PartyAlbumDocument, "_id"> | undefined;

  try {
    await session.withTransaction(async () => {
      const albums = db.collection<PartyAlbumDocument>("partyAlbums");
      const album = await albums.findOne(
        { eventId: input.eventId },
        { session },
      );
      const wasPublished = album?.published === true;
      if (wasPublished === input.published) {
        throw new PartyAlbumWriteError(
          409,
          input.published
            ? "A galeria já está publicada."
            : "A galeria já está oculta.",
        );
      }

      const nextPublication = {
        eventId: input.eventId,
        published: input.published,
        createdAt: album?.createdAt ?? input.now,
        updatedAt: input.now,
        updatedBy: input.actorId,
        ...(input.published
          ? { publishedAt: input.now, publishedBy: input.actorId }
          : {}),
      };

      if (album) {
        const changed = await albums.updateOne(
          { _id: album._id, eventId: input.eventId, published: wasPublished },
          {
            $set: nextPublication,
            ...(input.published
              ? {}
              : { $unset: { publishedAt: 1, publishedBy: 1 } }),
          },
          { session },
        );
        if (!changed.matchedCount) {
          throw new PartyAlbumWriteError(
            409,
            "Atualize a galeria e tente novamente.",
          );
        }
      } else {
        await albums.insertOne(
          { _id: new ObjectId(), ...nextPublication },
          { session },
        );
      }

      await db.collection("adminAudits").insertOne(
        {
          eventId: input.eventId,
          clerkUserId: input.actorId,
          action: input.published
            ? "party_album_published"
            : "party_album_unpublished",
          targetType: "party_album",
          targetId: input.eventId,
          at: input.now,
          changes: {
            published: { from: wasPublished, to: input.published },
          },
        },
        { session },
      );

      publication = nextPublication;
    });
  } finally {
    await session.endSession();
  }

  return publication;
}

export async function removePartyPhoto(
  client: MongoClient,
  db: Db,
  input: {
    eventId: ObjectId;
    photoId: ObjectId;
    actorId: string;
    now: Date;
  },
) {
  const session = client.startSession();
  let removed: PartyPhotoDocument | null = null;

  try {
    await session.withTransaction(async () => {
      const photos = db.collection<PartyPhotoDocument>("partyPhotos");
      const photo = await photos.findOne(
        {
          _id: input.photoId,
          eventId: input.eventId,
          removedAt: { $exists: false },
        },
        { session },
      );
      if (!photo) {
        throw new PartyAlbumWriteError(404, "Foto não encontrada.");
      }

      const changed = await photos.updateOne(
        {
          _id: input.photoId,
          eventId: input.eventId,
          removedAt: { $exists: false },
          assetId: photo.assetId,
        },
        { $set: { removedAt: input.now, removedBy: input.actorId } },
        { session },
      );
      if (!changed.matchedCount) {
        throw new PartyAlbumWriteError(
          409,
          "Atualize a galeria e tente novamente.",
        );
      }

      await enqueuePartyPhotoCleanup(
        db,
        {
          eventId: input.eventId,
          assetId: photo.assetId,
          publicId: photo.publicId,
          now: input.now,
        },
        session,
      );
      await db.collection("adminAudits").insertOne(
        {
          eventId: input.eventId,
          clerkUserId: input.actorId,
          action: "party_photo_removed",
          targetType: "party_photo",
          targetId: photo._id,
          at: input.now,
          changes: { removed: { from: false, to: true } },
        },
        { session },
      );
      removed = photo;
    });
  } finally {
    await session.endSession();
  }

  return removed;
}

export async function enqueuePartyPhotoCleanup(
  db: Db,
  job: { eventId: ObjectId; assetId: string; publicId: string; now: Date },
  session?: ClientSession,
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
    { upsert: true, ...(session ? { session } : {}) },
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
      .findOne(
        { eventId, assetId: job._id, removedAt: { $exists: false } },
        { projection: { _id: 1 } },
      );
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
