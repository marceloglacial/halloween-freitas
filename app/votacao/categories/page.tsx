import { ObjectId } from "mongodb";
import { redirect } from "next/navigation";
import FeatureUnavailable from "@/components/feature-unavailable";
import GuestFlowShell from "@/components/guest/guest-flow-shell";
import CategoryList from "@/components/votacao/category-list";
import {
  getGuestRegistration,
  GuestAccessError,
} from "@/lib/auth/guest-registration";
import { guestAccessUrl, validGuestEventId } from "@/util/guest-access";
import { getDb } from "@/lib/db";
import { getCurrentEvent, isVotingOpen } from "@/lib/events";
import { getCategories } from "@/util/get-categories";
import { getOpenVotingRound } from "@/lib/voting-rounds";

export const dynamic = "force-dynamic";

export default async function VotingCategoriesPage({
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
  let session;
  try {
    session = await getGuestRegistration(event._id);
  } catch (error) {
    if (!(error instanceof GuestAccessError)) throw error;
    redirect(guestAccessUrl(event._id, "/votacao/categories"));
  }

  const round = await getOpenVotingRound(session.eventId);
  if (!round) {
    return (
      <FeatureUnavailable
        title="Rodada indisponível"
        message="A votação ainda não tem uma rodada aberta."
      />
    );
  }
  const [allCategories, votes] = await Promise.all([
    getCategories(session.eventId),
    (await getDb())
      .collection("votes")
      .find(
        {
          eventId: new ObjectId(session.eventId),
          roundId: round._id,
          voterRsvpId: new ObjectId(session.userId),
        },
        { projection: { categoryId: 1 } },
      )
      .toArray(),
  ]);
  const categories = allCategories.filter((category) =>
    round.categoryIds.some((id) => id.toString() === category._id),
  );
  const votedCategoryIds = new Set(
    votes.map((vote) => vote.categoryId.toString()),
  );

  return (
    <GuestFlowShell
      eventId={event._id}
      eventYear={event.year}
      guestName={session.fullName}
      votingOpen
      contestEntryClosed
      title="Votação"
      description="Escolha uma categoria para ver as fantasias e registrar seu voto. Você pode votar na mesma pessoa em mais de uma categoria."
    >
      <p className="font-semibold text-orange-300" aria-live="polite">
        {votedCategoryIds.size} de {categories.length} categorias concluídas
      </p>
      {categories.length ? (
        <CategoryList
          categories={categories}
          votedCategoryIds={votedCategoryIds}
        />
      ) : (
        <p className="rounded-2xl border border-white/10 bg-stone-900 p-5 text-stone-300">
          Nenhuma categoria encontrada.
        </p>
      )}
    </GuestFlowShell>
  );
}
