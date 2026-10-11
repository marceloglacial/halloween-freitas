import { ObjectId } from "mongodb";
import Link from "next/link";
import { redirect } from "next/navigation";
import CategoryList from "@/components/votacao/category-list";
import FeatureUnavailable from "@/components/feature-unavailable";
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
    <section className="flex min-h-screen w-full flex-col items-center justify-center gap-8 p-8 text-center">
      <h1 className="text-5xl">
        Bem-vindo, <br />
        {session.fullName}!
      </h1>
      <p className="mt-2 max-w-2xl text-xl text-orange-100 lg:text-2xl">
        Você pode votar na mesma pessoa em mais de uma categoria. Escolha uma
        categoria, confira seu voto antes de confirmar e volte aqui para
        continuar quando quiser.
      </p>
      <p className="font-semibold text-orange-300" aria-live="polite">
        {votedCategoryIds.size} de {categories.length} categorias concluídas
      </p>
      <Link
        href={`/meu-halloween?${new URLSearchParams({ eventId: event._id })}`}
        className="text-orange-300 underline focus-visible:outline-2"
      >
        Meu Halloween
      </Link>
      {categories.length ? (
        <CategoryList
          categories={categories}
          votedCategoryIds={votedCategoryIds}
        />
      ) : (
        <p>Nenhuma categoria encontrada.</p>
      )}
    </section>
  );
}
