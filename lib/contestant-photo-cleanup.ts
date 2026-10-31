import { ObjectId, type ClientSession, type Db } from "mongodb";
import { deleteContestPhotoAsset } from "@/lib/contestant-photos";

type CleanupJob = {
  _id: string;
  eventId: ObjectId;
  publicId: string;
  attempts: number;
  nextAttemptAt: Date;
};

export async function enqueueContestPhotoCleanup(
  db: Db,
  job: Omit<CleanupJob, "_id" | "attempts" | "nextAttemptAt"> & {
    assetId: string;
    now: Date;
  },
  session?: ClientSession,
) {
  const collection = db.collection<CleanupJob>("contest-photo-cleanups");
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
    session ? { upsert: true, session } : { upsert: true },
  );
}

export async function retryContestPhotoCleanup(
  db: Db,
  eventId: ObjectId,
  now = new Date(),
) {
  const jobs = await db
    .collection<CleanupJob>("contest-photo-cleanups")
    .find({ eventId, nextAttemptAt: { $lte: now } })
    .sort({ nextAttemptAt: 1, _id: 1 })
    .limit(10)
    .toArray();
  const collection = db.collection<CleanupJob>("contest-photo-cleanups");

  for (const job of jobs) {
    const stillReferenced = await db
      .collection("contestants")
      .findOne({ "contestPhoto.assetId": job._id }, { projection: { _id: 1 } });
    if (stillReferenced) {
      await collection.updateOne(
        { _id: job._id },
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
      await deleteContestPhotoAsset(job.publicId);
      await collection.deleteOne({ _id: job._id, eventId });
    } catch {
      const attempts = job.attempts + 1;
      await collection.updateOne(
        { _id: job._id, eventId },
        {
          $set: {
            attempts,
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
