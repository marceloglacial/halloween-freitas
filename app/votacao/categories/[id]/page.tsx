import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import BackButton from "@/components/back-button";
import GuestFlowShell from "@/components/guest/guest-flow-shell";
import VoteGrid from "@/components/votacao/vote-grid";
import FeatureUnavailable from "@/components/feature-unavailable";
import {
  getGuestRegistration,
  GuestAccessError,
} from "@/lib/auth/guest-registration";
import { guestAccessUrl, validGuestEventId } from "@/util/guest-access";
import { getCurrentEvent, isVotingOpen } from "@/lib/events";
import { getVotingCandidatesForCategory } from "@/lib/contestant-entries";
import { getCategoryById } from "@/util/get-categories";
import {
  getRoundCandidateIds,
  getOpenVotingRound,
  hasVotedInRoundCategory,
  roundIncludesCategory,
} from "@/lib/voting-rounds";

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
  const round = await getOpenVotingRound(session.eventId);
  if (!round || !roundIncludesCategory(round, session.eventId, category._id)) {
    return (
      <FeatureUnavailable
        title="Categoria indisponível"
        message="Esta categoria não faz parte da rodada aberta."
      />
    );
  }
  if (
    await hasVotedInRoundCategory(
      session.eventId,
      round._id,
      session.userId,
      category._id,
    )
  ) {
    return (
      <GuestFlowShell
        eventId={event._id}
        eventYear={event.year}
        guestName={session.fullName}
        votingOpen
        contestEntryClosed
        title="Categoria concluída"
        description="Seu voto nesta categoria já foi registrado. Continue pelas categorias que ainda estão abertas."
      >
        <Link
          className="inline-flex min-h-11 items-center justify-center self-start rounded-xl bg-orange-400 px-5 py-3 font-semibold text-black focus-visible:outline-2"
          href={`/votacao/categories?eventId=${event._id}`}
        >
          Voltar às categorias
        </Link>
      </GuestFlowShell>
    );
  }

  const users = await getVotingCandidatesForCategory(
    session.eventId,
    category,
    session.userId,
    getRoundCandidateIds(round, category._id),
  );

  return (
    <GuestFlowShell
      eventId={event._id}
      eventYear={event.year}
      guestName={session.fullName}
      votingOpen
      contestEntryClosed
      title={`${category.icon} ${category.title}`}
      description="Escolha a fantasia que receberá seu voto nesta categoria."
    >
      <BackButton href={`/votacao/categories?eventId=${event._id}`} />
      <VoteGrid
        users={users}
        categoryId={category._id}
        roundId={round._id.toString()}
        eventId={event._id}
      />
    </GuestFlowShell>
  );
}
