import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db";
import { isCompleteContestantEntry } from "@/lib/contestant-entry-freeze";
import type { ContestantEntryDocument } from "@/lib/contestant-entries";
import type { PartyPhotoDocument } from "@/lib/party-photo-writes";

export type EventOverview = {
  confirmedRsvps: number;
  eligibleContestants: number;
  votingGuests: number;
  categories: number;
  partyPhotos: number;
  albumPublished: boolean;
};

type OverviewCategory = {
  _id: ObjectId;
  eligibility?: Category["eligibility"];
};

/** Loads the overview using event-scoped queries; no per-record database lookups. */
export async function getAdminEventOverview(
  eventId: string,
): Promise<EventOverview> {
  if (!ObjectId.isValid(eventId)) throw new Error("INVALID_EVENT_ID");
  const id = new ObjectId(eventId);
  const db = await getDb();
  const [
    confirmedRsvps,
    votingGuestIds,
    categories,
    contestants,
    partyPhotos,
    album,
  ] =
    await Promise.all([
      db
        .collection("users")
        .countDocuments({ eventId: id, status: { $ne: "cancelled" } }),
      db.collection("votes").distinct("voterRsvpId", { eventId: id }),
      db
        .collection<OverviewCategory>("categories")
        .find({ eventId: id }, { projection: { _id: 1, eligibility: 1 } })
        .toArray(),
      db
        .collection<ContestantEntryDocument>("contestants")
        .find(
          { eventId: id, status: { $in: ["draft", "ready", "locked"] } },
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
        .toArray(),
      db
        .collection<PartyPhotoDocument>("partyPhotos")
        .countDocuments({ eventId: id, removedAt: { $exists: false } }),
      db
        .collection<{ eventId: ObjectId; published: boolean }>("partyAlbums")
        .findOne({ eventId: id }, { projection: { published: 1 } }),
    ]);
  const votingGuests =
    votingGuestIds.length === 0
      ? 0
      : await db.collection("users").countDocuments({
          _id: { $in: votingGuestIds },
          eventId: id,
          status: { $ne: "cancelled" },
        });
  const eligibilityByCategory = new Map(
    categories.map((category) => [
      category._id.toString(),
      category.eligibility ?? "all",
    ]),
  );
  const eligibleContestants = contestants.filter((entry) =>
    entry.entryType === "individual" &&
    isCompleteContestantEntry(entry, eligibilityByCategory),
  ).length;
  return {
    confirmedRsvps,
    eligibleContestants,
    votingGuests,
    categories: categories.length,
    partyPhotos,
    albumPublished: album?.published === true,
  };
}
