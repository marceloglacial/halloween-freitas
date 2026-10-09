import { ObjectId, type ClientSession, type Db } from "mongodb";
import type { ContestantEntryDocument } from "@/lib/contestant-entries";

type ContestCategory = {
  _id: ObjectId;
  eligibility?: Category["eligibility"];
};

function sameId(left: unknown, right: unknown) {
  if (right instanceof ObjectId && typeof left === "string") {
    return right.toString() === left;
  }
  return (
    left instanceof ObjectId && right instanceof ObjectId && left.equals(right)
  );
}

export function isCompleteContestantEntry(
  entry: ContestantEntryDocument,
  categories: Map<string, Category["eligibility"]>,
) {
  const eligibility = categories.get(entry.categoryId.toString());
  const ownerId =
    entry.entryType === "junior" ? entry.guardianRsvpId : entry.ownerRsvpId;
  const photo = entry.contestPhoto;

  return Boolean(
    entry.status !== "withdrawn" &&
    ["individual", "junior", "group"].includes(entry.entryType) &&
    entry.displayName.trim() &&
    eligibility &&
    (eligibility === "all" ||
      (eligibility === "group" && entry.entryType === "group") ||
      (eligibility === "junior" && entry.entryType === "junior")) &&
    ownerId &&
    photo?.assetId &&
    photo.publicId &&
    photo.publicId.startsWith(`contest-photos/${entry.eventId.toString()}/`) &&
    photo.consentAt instanceof Date &&
    sameId(photo.consentByRsvpId, ownerId),
  );
}

export async function freezeContestantEntries(
  db: Db,
  eventId: ObjectId,
  session: ClientSession,
  now: Date,
) {
  const categories = await db
    .collection<ContestCategory>("categories")
    .find({ eventId }, { projection: { _id: 1, eligibility: 1 }, session })
    .toArray();
  const eligibilityByCategory = new Map(
    categories.map((category) => [
      category._id.toString(),
      category.eligibility ?? "all",
    ]),
  );
  const entries = await db
    .collection<ContestantEntryDocument>("contestants")
    .find(
      { eventId, status: { $ne: "withdrawn" } },
      {
        projection: {
          _id: 1,
          categoryId: 1,
          entryType: 1,
          displayName: 1,
          status: 1,
          ownerRsvpId: 1,
          guardianRsvpId: 1,
          contestPhoto: 1,
        },
        session,
      },
    )
    .toArray();
  const completeIds = entries
    .filter((entry) => isCompleteContestantEntry(entry, eligibilityByCategory))
    .map((entry) => entry._id);
  const incompleteReadyIds = entries
    .filter(
      (entry) =>
        entry.status === "ready" &&
        !isCompleteContestantEntry(entry, eligibilityByCategory),
    )
    .map((entry) => entry._id);

  if (completeIds.length) {
    await db.collection("contestants").updateMany(
      {
        eventId,
        _id: { $in: completeIds },
        status: { $in: ["draft", "ready"] },
      },
      { $set: { status: "locked", updatedAt: now } },
      { session },
    );
  }
  if (incompleteReadyIds.length) {
    await db
      .collection("contestants")
      .updateMany(
        { eventId, _id: { $in: incompleteReadyIds }, status: "ready" },
        { $set: { status: "draft", updatedAt: now } },
        { session },
      );
  }
}

export async function reopenContestantEntries(
  db: Db,
  eventId: ObjectId,
  session: ClientSession,
  now: Date,
) {
  await db
    .collection("contestants")
    .updateMany(
      { eventId, status: "locked" },
      { $set: { status: "ready", updatedAt: now } },
      { session },
    );
}

export function entryCanVoteForCategory(
  entry: ContestantEntryDocument,
  category: Pick<Category, "_id" | "eventId" | "eligibility">,
  voterRsvpId: ObjectId,
) {
  if (
    entry.status !== "locked" ||
    !entry.categoryId.equals(new ObjectId(category._id)) ||
    entry.eventId.toString() !== category.eventId
  ) {
    return false;
  }
  if (category.eligibility === "group" && entry.entryType !== "group") {
    return false;
  }
  if (category.eligibility === "junior" && entry.entryType !== "junior") {
    return false;
  }
  if (
    entry.entryType === "individual" &&
    sameId(entry.ownerRsvpId, voterRsvpId)
  ) {
    return false;
  }
  return true;
}
