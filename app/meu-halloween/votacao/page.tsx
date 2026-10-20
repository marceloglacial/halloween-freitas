import { ObjectId } from "mongodb";
import Link from "next/link";
import FeatureUnavailable from "@/components/feature-unavailable";
import GuestFlowShell from "@/components/guest/guest-flow-shell";
import { getGuestPageContext } from "@/app/meu-halloween/guest-page-context";
import { getDb } from "@/lib/db";
import { isVotingOpen } from "@/lib/events";
import { getOpenVotingRound } from "@/lib/voting-rounds";
import { getCategories } from "@/util/get-categories";

export const dynamic = "force-dynamic";

type VoteDocument = { categoryId: ObjectId };

export default async function GuestVotingPage({
  searchParams,
}: {
  searchParams: Promise<{ eventId?: string }>;
}) {
  const query = await searchParams;
  const context = await getGuestPageContext(
    query.eventId,
    "/meu-halloween/votacao",
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

  if (!votingOpen) {
    const message =
      event.votingStatus === "ended"
        ? "A votação desta edição foi encerrada."
        : "A votação ficará disponível quando o evento começar e a organização abri-la.";
    return (
      <GuestFlowShell
        eventTitle={event.title}
        eventId={event._id}
        guestName={guest.fullName}
        title="Votação"
        description={message}
      >
        <p role="status" className="rounded-2xl border border-white/10 bg-stone-900 p-5 text-center text-stone-300">
          As categorias de votação ainda não estão disponíveis.
        </p>
      </GuestFlowShell>
    );
  }

  const [round, categories] = await Promise.all([
    getOpenVotingRound(event._id),
    getCategories(event._id),
  ]);
  if (!round) {
    return (
      <FeatureUnavailable
        title="Votação indisponível"
        message="A votação está aberta, mas não encontramos uma rodada ativa. Tente novamente em instantes."
      />
    );
  }

  const db = await getDb();
  const votes = await db
    .collection<VoteDocument>("votes")
    .find(
      {
        eventId: new ObjectId(event._id),
        roundId: round._id,
        voterRsvpId: new ObjectId(guest.userId),
      },
      { projection: { categoryId: 1 } },
    )
    .toArray();
  const voted = new Set(votes.map((vote) => vote.categoryId.toString()));

  return (
    <GuestFlowShell
      eventTitle={event.title}
      eventId={event._id}
      guestName={guest.fullName}
      title="Votação"
      description="Escolha uma categoria para ver as fantasias e registrar seu voto."
    >
      {categories.length ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {categories.map((category) => {
            const alreadyVoted = voted.has(category._id);
            return (
              <li key={category._id}>
                {alreadyVoted ? (
                  <div
                    aria-disabled="true"
                    className="flex min-h-20 items-center gap-4 rounded-xl bg-gray-700 p-4 text-stone-300"
                  >
                    <span className="text-4xl" aria-hidden="true">
                      {category.icon}
                    </span>
                    <span>
                      {category.title}
                      <span className="block text-sm">Voto registrado</span>
                    </span>
                  </div>
                ) : (
                  <Link
                    href={`/votacao/categories/${category._id}?eventId=${event._id}`}
                    className="flex min-h-20 items-center gap-4 rounded-xl bg-purple-600 p-4 hover:bg-purple-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300"
                  >
                    <span className="text-4xl" aria-hidden="true">
                      {category.icon}
                    </span>
                    <span>{category.title}</span>
                    <span className="ml-auto text-sm">Votar →</span>
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="rounded-2xl border border-white/10 bg-stone-900 p-5 text-stone-300">
          Nenhuma categoria foi configurada para esta edição.
        </p>
      )}
    </GuestFlowShell>
  );
}
