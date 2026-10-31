import { ObjectId, type Db } from "mongodb";
import { getDb } from "@/lib/db";
import type { ContestantEntryDocument } from "@/lib/contestant-entries";
import { isCompleteContestantEntry } from "@/lib/contestant-entry-freeze";
import type { ContestPhotoFormat } from "@/lib/contestant-photos";
import { parseObjectId } from "@/lib/http";

type GalleryCategory = {
  _id: ObjectId;
  eventId: ObjectId;
  title: string;
  icon?: string;
  eligibility?: Category["eligibility"];
};

type GalleryEntryDocument = Pick<
  ContestantEntryDocument,
  | "_id"
  | "eventId"
  | "categoryId"
  | "entryType"
  | "displayName"
  | "status"
  | "ownerRsvpId"
  | "contestPhoto"
>;

export type PublicContestGalleryEntry = {
  _id: string;
  displayName: string;
  entryType: ContestantEntryType;
  categoryTitle: string;
  categoryIcon?: string;
  width: number;
  height: number;
};

export type PublicContestGalleryPhoto = {
  publicId: string;
  format: ContestPhotoFormat;
};

function completeEntry(
  entry: GalleryEntryDocument,
  category: GalleryCategory | null,
) {
  if (
    !category ||
    !["ready", "locked"].includes(entry.status) ||
    !entry.eventId.equals(category.eventId) ||
    !entry.categoryId.equals(category._id)
  ) {
    return false;
  }
  return isCompleteContestantEntry(
    entry as ContestantEntryDocument,
    new Map([[category._id.toString(), category.eligibility ?? "all"]]),
  );
}

function hasGalleryPhotoMetadata(entry: GalleryEntryDocument) {
  const photo = entry.contestPhoto;
  return Boolean(
    photo &&
    ["jpg", "png", "webp"].includes(photo.format) &&
    Number.isSafeInteger(photo.width) &&
    photo.width > 0 &&
    Number.isSafeInteger(photo.height) &&
    photo.height > 0,
  );
}

async function getGalleryEntries(db: Db, eventId: ObjectId) {
  const [categories, entries] = await Promise.all([
    db
      .collection<GalleryCategory>("categories")
      .find(
        { eventId },
        {
          projection: { _id: 1, eventId: 1, title: 1, icon: 1, eligibility: 1 },
        },
      )
      .toArray(),
    db
      .collection<GalleryEntryDocument>("contestants")
      .find(
        {
          eventId,
          status: { $in: ["ready", "locked"] },
          "contestPhoto.assetId": { $exists: true },
          "contestPhoto.publicId": { $exists: true },
          "contestPhoto.consentAt": { $type: "date" },
          "contestPhoto.consentByRsvpId": { $exists: true },
        },
        {
          projection: {
            _id: 1,
            eventId: 1,
            categoryId: 1,
            entryType: 1,
            displayName: 1,
            status: 1,
            ownerRsvpId: 1,
            contestPhoto: 1,
          },
        },
      )
      .sort({ displayName: 1, _id: 1 })
      .toArray(),
  ]);
  const categoryById = new Map(
    categories.map((category) => [category._id.toString(), category]),
  );
  const ownerIds = entries.flatMap((entry) => {
    const owner = entry.ownerRsvpId;
    return owner ? [owner] : [];
  });
  const sameEditionOwners = new Set(
    (
      await db
        .collection<{ _id: ObjectId }>("users")
        .find({ _id: { $in: ownerIds }, eventId }, { projection: { _id: 1 } })
        .toArray()
    ).map((owner) => owner._id.toString()),
  );
  return entries.flatMap((entry) => {
    const category = categoryById.get(entry.categoryId.toString()) ?? null;
    const owner = entry.ownerRsvpId;
    if (
      !owner ||
      !sameEditionOwners.has(owner.toString()) ||
      !completeEntry(entry, category) ||
      !hasGalleryPhotoMetadata(entry)
    ) {
      return [];
    }
    return [{ entry, category: category! }];
  });
}

export async function getPublicContestGalleryEntries(eventId: string) {
  const eventObjectId = parseObjectId(eventId);
  if (!eventObjectId) return [];
  const db = await getDb();
  return (await getGalleryEntries(db, eventObjectId)).map(
    ({ entry, category }) => ({
      _id: entry._id.toString(),
      displayName: entry.displayName,
      entryType: entry.entryType,
      categoryTitle: category.title,
      ...(category.icon ? { categoryIcon: category.icon } : {}),
      width: entry.contestPhoto!.width,
      height: entry.contestPhoto!.height,
    }),
  ) satisfies PublicContestGalleryEntry[];
}

export async function getPublicContestGalleryPhoto(
  db: Db,
  eventId: ObjectId,
  entryId: ObjectId,
): Promise<PublicContestGalleryPhoto | null> {
  const entry = await db
    .collection<GalleryEntryDocument>("contestants")
    .findOne(
      {
        _id: entryId,
        eventId,
        status: { $in: ["ready", "locked"] },
      },
      {
        projection: {
          _id: 1,
          eventId: 1,
          categoryId: 1,
          entryType: 1,
          displayName: 1,
          status: 1,
          ownerRsvpId: 1,
          contestPhoto: 1,
        },
      },
    );
  if (!entry?.contestPhoto) return null;
  const category = await db.collection<GalleryCategory>("categories").findOne(
    { _id: entry.categoryId, eventId },
    {
      projection: {
        _id: 1,
        eventId: 1,
        title: 1,
        icon: 1,
        eligibility: 1,
      },
    },
  );
  if (!completeEntry(entry, category) || !hasGalleryPhotoMetadata(entry)) {
    return null;
  }
  const owner = entry.ownerRsvpId;
  if (
    !owner ||
    !(await db
      .collection<{ _id: ObjectId }>("users")
      .findOne({ _id: owner, eventId }, { projection: { _id: 1 } }))
  ) {
    return null;
  }
  return {
    publicId: entry.contestPhoto.publicId,
    format: entry.contestPhoto.format,
  };
}
