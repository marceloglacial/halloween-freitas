import { getContestantEntriesForRsvp } from "@/lib/contestant-entries";
import { contestPhotoPreviewUrl } from "@/lib/contestant-photos";

export async function getGuestEntriesWithPhotos(eventId: string, rsvpId: string) {
  const entries = await getContestantEntriesForRsvp(eventId, rsvpId);
  return entries.map(({ contestPhoto, ...entry }) => ({
    ...entry,
    photoUrl: contestPhoto
      ? contestPhotoPreviewUrl(contestPhoto.publicId, contestPhoto.format)
      : null,
  }));
}
