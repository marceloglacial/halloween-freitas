import FeatureUnavailable from "@/components/feature-unavailable";
import { redirect } from "next/navigation";
import { guestAccessUrl, validGuestEventId } from "@/util/guest-access";
import { getCurrentEvent, isVotingOpen } from "@/lib/events";

export const dynamic = "force-dynamic";

export default async function VotingLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ eventId?: string }>;
}) {
  const event = await getCurrentEvent();
  const query = await searchParams;
  if (
    !event ||
    !isVotingOpen(event) ||
    (query.eventId !== undefined &&
      (!validGuestEventId(query.eventId) || query.eventId !== event._id))
  ) {
    return (
      <FeatureUnavailable
        title="Votação encerrada"
        message="A votação não está aberta no momento."
      />
    );
  }

  redirect(guestAccessUrl(event._id));
}
