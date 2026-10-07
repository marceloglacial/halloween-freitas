import { notFound, redirect } from "next/navigation";
import BackButton from "@/components/back-button";
import VoteGrid from "@/components/votacao/vote-grid";
import FeatureUnavailable from "@/components/feature-unavailable";
import {
  getGuestRegistration,
  GuestAccessError,
} from "@/lib/auth/guest-registration";
import { guestAccessUrl, validGuestEventId } from "@/util/guest-access";
import { getCurrentEvent, isVotingOpen } from "@/lib/events";
import { getPublicVotingUsersForEvent } from "@/lib/users";
import { getCategoryById } from "@/util/get-categories";
import { isEligibleCandidate } from "@/lib/voting";

export const dynamic = "force-dynamic";

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
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
  let session;
  try {
    session = await getGuestRegistration(event._id);
  } catch (error) {
    if (!(error instanceof GuestAccessError)) throw error;
    redirect(
      guestAccessUrl(event._id, `/votacao/categories/${(await params).id}`),
    );
  }

  const category = await getCategoryById((await params).id);
  if (!category || category.eventId !== session.eventId) notFound();

  const users = (await getPublicVotingUsersForEvent(session.eventId)).filter(
    (user) => isEligibleCandidate(category, user, session.userId),
  );

  return (
    <section className="min-h-screen w-full px-8 py-16 text-center">
      <BackButton href={`/votacao/categories?eventId=${event._id}`} />
      <h1 className="mt-8 mb-8 text-4xl lg:text-6xl">
        {category.icon} {category.title}
      </h1>
      <VoteGrid users={users} categoryId={category._id} eventId={event._id} />
    </section>
  );
}
