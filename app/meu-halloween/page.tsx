import GuestPortal from "@/components/guest/guest-portal";
import FeatureUnavailable from "@/components/feature-unavailable";
import { getContestantEntriesForRsvp } from "@/lib/contestant-entries";
import { getGuestPageContext } from "@/app/meu-halloween/guest-page-context";

export const dynamic = "force-dynamic";

export default async function MeuHalloweenPage({
  searchParams,
}: {
  searchParams: Promise<{ eventId?: string }>;
}) {
  const query = await searchParams;
  const context = await getGuestPageContext(query.eventId, "/meu-halloween");
  if (!context.ok) {
    return (
      <FeatureUnavailable title={context.title} message={context.message} />
    );
  }
  const { event, guest } = context;

  const now = new Date();
  const entries = (
    await getContestantEntriesForRsvp(event._id, guest.userId)
  ).map((entry) => ({
    _id: entry._id,
    categoryId: entry.categoryId,
    entryType: entry.entryType,
    displayName: entry.displayName,
    ...(entry.costumeTitle ? { costumeTitle: entry.costumeTitle } : {}),
    status: entry.status,
  }));
  return (
    <GuestPortal
      event={event}
      guestName={guest.fullName}
      entries={entries}
      now={now.toISOString()}
    />
  );
}
