import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db";
import type { ContestantEntryDocument } from "@/lib/contestant-entries";
import type { UserDocument } from "@/lib/users";
import { getCategories } from "@/util/get-categories";

export type AdminGuestDetail = {
  guest: {
    _id: string;
    eventId: string;
    fullName: string;
    email: string;
    clerkUserId?: string;
    status?: "confirmed" | "cancelled";
  };
  entries: Array<{
    _id: string;
    entryType: ContestantEntryType;
    displayName: string;
    costumeTitle?: string;
    status: ContestantEntryStatus;
    categoryTitle: string;
    categoryIcon: string;
    photoUrl: string | null;
  }>;
};

export async function getAdminGuestDetail(
  event: HalloweenEvent,
  guestId: string,
): Promise<AdminGuestDetail | null> {
  if (!ObjectId.isValid(event._id) || !ObjectId.isValid(guestId)) return null;
  const db = await getDb();
  const eventId = new ObjectId(event._id);
  const guest = await db
    .collection<UserDocument>("users")
    .findOne({ _id: new ObjectId(guestId), eventId });
  if (!guest) return null;

  const [entries, categories] = await Promise.all([
    db
      .collection<ContestantEntryDocument>("contestants")
      .find({ eventId, ownerRsvpId: guest._id })
      .sort({ createdAt: 1, _id: 1 })
      .toArray(),
    getCategories(event._id),
  ]);
  const categoriesById = new Map(
    categories.map((category) => [category._id, category]),
  );

  return {
    guest: {
      _id: guest._id.toString(),
      eventId: event._id,
      fullName: guest.fullName,
      email: guest.email,
      ...(guest.clerkUserId ? { clerkUserId: guest.clerkUserId } : {}),
      ...(guest.status ? { status: guest.status } : {}),
    },
    entries: entries.map((entry) => ({
      _id: entry._id.toString(),
      entryType: entry.entryType,
      displayName: entry.displayName,
      ...(entry.costumeTitle ? { costumeTitle: entry.costumeTitle } : {}),
      status: entry.status,
      categoryTitle:
        categoriesById.get(entry.categoryId.toString())?.title ??
        "Categoria indisponível",
      categoryIcon: categoriesById.get(entry.categoryId.toString())?.icon ?? "",
      photoUrl: entry.contestPhoto?.assetId
        ? `/api/admin/events/${event._id}/contestants/${entry._id.toString()}/photo`
        : null,
    })),
  };
}
