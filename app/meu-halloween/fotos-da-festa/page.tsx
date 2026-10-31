import FeatureUnavailable from "@/components/feature-unavailable";
import GuestFlowShell from "@/components/guest/guest-flow-shell";
import PartyPhotoUpload from "@/components/guest/party-photo-upload";
import { getGuestPageContext } from "@/app/meu-halloween/guest-page-context";
import { isVotingOpen } from "@/lib/events";
import { getContestEntryState } from "@/util/contest-entry-state";

export const dynamic = "force-dynamic";

export default async function PartyPhotosPage({
  searchParams,
}: {
  searchParams: Promise<{ eventId?: string }>;
}) {
  const query = await searchParams;
  const context = await getGuestPageContext(
    query.eventId,
    "/meu-halloween/fotos-da-festa",
  );
  if (!context.ok) {
    return (
      <FeatureUnavailable title={context.title} message={context.message} />
    );
  }

  const { event, guest } = context;
  const now = new Date();
  const eventStarted = now.getTime() >= new Date(event.eventStartsAt).getTime();
  const votingOpen = isVotingOpen(event) && eventStarted;
  const contestEntryClosed = getContestEntryState(event, now) === "closed";

  return (
    <GuestFlowShell
      eventId={event._id}
      eventYear={event.year}
      guestName={guest.fullName}
      votingOpen={votingOpen}
      contestEntryClosed={contestEntryClosed}
      title="Fotos da festa"
      description="Este espaço é para fotos gerais da festa, separado das fotos das fantasias do concurso."
    >
      <PartyPhotoUpload eventId={event._id} available={eventStarted} />
    </GuestFlowShell>
  );
}
