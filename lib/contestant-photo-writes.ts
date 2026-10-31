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
        ownerRsvpId: input.rsvpId,
      };
      const entry = await collection.findOne(ownership, {
        projection: { _id: 1, status: 1, entryType: 1, contestPhoto: 1 },
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

export async function removeContestPhotoForGuest(
  client: MongoClient,
  db: Db,
  input: { eventId: ObjectId; entryId: ObjectId; rsvpId: ObjectId; now: Date },
) {
  const session = client.startSession();
  let removedPhoto: ContestPhotoAsset | undefined;
  try {
    await session.withTransaction(async () => {
      await claimContestEntryWrite(db, input.eventId, session, input.now);
      const collection = db.collection("contestants");
      const ownership = {
        _id: input.entryId,
        eventId: input.eventId,
        ownerRsvpId: input.rsvpId,
      };
      const entry = await collection.findOne(ownership, {
        projection: { _id: 1, status: 1, entryType: 1, contestPhoto: 1 },
        session,
      });
      if (!entry) throw new ContestPhotoWriteError(404, "entry_not_found");
      if (entry.status === "locked" || entry.status === "withdrawn") {
        throw new ContestPhotoWriteError(409, "entry_not_editable");
      }
      removedPhoto = entry.contestPhoto as ContestPhotoAsset | undefined;
      if (!removedPhoto?.assetId || !removedPhoto.publicId) {
        throw new ContestPhotoWriteError(404, "photo_not_found");
      }
      const filter = {
        ...ownership,
        "contestPhoto.assetId": removedPhoto.assetId,
      };
      const matched =
        entry.entryType === "individual"
          ? (
              await collection.deleteOne(filter, {
                session,
              })
            ).deletedCount
          : (
              await collection.updateOne(
                filter,
                {
                  $unset: { contestPhoto: "" },
                  $set: { status: "draft", updatedAt: input.now },
                },
                { session },
              )
            ).matchedCount;
      if (!matched) {
        throw new ContestPhotoWriteError(409, "photo_changed_retry");
      }
      await enqueueContestPhotoCleanup(
        db,
        {
          eventId: input.eventId,
          assetId: removedPhoto.assetId,
          publicId: removedPhoto.publicId,
          now: input.now,
        },
        session,
      );
    });
  } finally {
    await session.endSession();
  }
  return removedPhoto;
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
        {
          projection: {
            _id: 1,
            status: 1,
            entryType: 1,
            ownerRsvpId: 1,
            contestPhoto: 1,
          },
          session,
        },
      );
      if (!entry) throw new ContestPhotoWriteError(404, "entry_not_found");
      previousPhoto = entry.contestPhoto as ContestPhotoAsset | undefined;
      if (!previousPhoto?.assetId) {
        await claimContestEntryWrite(db, input.eventId, session, input.now);
      }
      if (
        previousPhoto &&
        (!previousPhoto.assetId || !previousPhoto.consentAt)
      ) {
        throw new ContestPhotoWriteError(409, "photo_consent_required");
      }

      if (
        !input.photo.consentAt ||
        !input.photo.consentByRsvpId ||
        input.photo.consentByRsvpId !== entry.ownerRsvpId?.toString()
      ) {
        throw new ContestPhotoWriteError(409, "photo_consent_required");
      }

      const ownership = { _id: input.entryId, eventId: input.eventId };
      const filter = previousPhoto?.assetId
        ? { ...ownership, "contestPhoto.assetId": previousPhoto.assetId }
        : { ...ownership, contestPhoto: { $exists: false } };
      const fields: Record<string, unknown> = {
        contestPhoto: {
          ...input.photo,
          consentAt: previousPhoto?.consentAt ?? input.photo.consentAt,
          consentByRsvpId:
            previousPhoto?.consentByRsvpId ?? input.photo.consentByRsvpId,
        },
        updatedAt: input.now,
      };
      if (entry.status === "draft") fields.status = "ready";
      const update = await contestants.updateOne(
        filter,
        { $set: fields },
        { session },
      );
      if (!update.matchedCount) {
        throw new ContestPhotoWriteError(409, "photo_changed_retry");
      }

      await db.collection("adminAudits").insertOne(
        {
          eventId: input.eventId,
          clerkUserId: input.actorId,
          action: previousPhoto
            ? "contest_photo_replaced"
            : "contest_photo_added_by_admin",
          targetType: "contestant",
          targetId: input.entryId,
          at: input.now,
          changes: {
            ...(previousPhoto ? { beforeAssetId: previousPhoto.assetId } : {}),
            afterAssetId: input.photo.assetId,
          },
        },
        { session },
      );

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

export async function removeContestPhotoForAdmin(
  client: MongoClient,
  db: Db,
  input: {
    eventId: ObjectId;
    entryId: ObjectId;
    actorId: string;
    now: Date;
  },
) {
  const session = client.startSession();
  let removedPhoto: ContestPhotoAsset | undefined;

  try {
    await session.withTransaction(async () => {
      await claimContestEntryWrite(db, input.eventId, session, input.now);
      const contestants = db.collection("contestants");
      const entry = await contestants.findOne(
        { _id: input.entryId, eventId: input.eventId },
        { projection: { _id: 1, contestPhoto: 1 }, session },
      );
      if (!entry) throw new ContestPhotoWriteError(404, "entry_not_found");
      removedPhoto = entry.contestPhoto as ContestPhotoAsset | undefined;
      if (!removedPhoto?.assetId || !removedPhoto.publicId) {
        throw new ContestPhotoWriteError(404, "photo_not_found");
      }

      const result = await contestants.updateOne(
        {
          _id: input.entryId,
          eventId: input.eventId,
          "contestPhoto.assetId": removedPhoto.assetId,
        },
        {
          $unset: { contestPhoto: "" },
          $set: { status: "draft", updatedAt: input.now },
        },
        { session },
      );
      if (!result.matchedCount) {
        throw new ContestPhotoWriteError(409, "photo_changed_retry");
      }
      await db.collection("adminAudits").insertOne(
        {
          eventId: input.eventId,
          clerkUserId: input.actorId,
          action: "contest_photo_removed_by_admin",
          targetType: "contestant",
          targetId: input.entryId,
          at: input.now,
          changes: { beforeAssetId: removedPhoto.assetId },
        },
        { session },
      );
      await enqueueContestPhotoCleanup(
        db,
        {
          eventId: input.eventId,
          assetId: removedPhoto.assetId,
          publicId: removedPhoto.publicId,
          now: input.now,
        },
        session,
      );
    });
  } finally {
    await session.endSession();
  }

  return removedPhoto;
}
