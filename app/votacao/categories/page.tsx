import { ObjectId } from "mongodb";
import { redirect } from "next/navigation";
import CategoryList from "@/components/votacao/category-list";
import FeatureUnavailable from "@/components/feature-unavailable";
import { getGuestSession } from "@/lib/auth/guest-session";
import { getDb } from "@/lib/db";
import { getCurrentEvent, isVotingOpen } from "@/lib/events";
import { getCategories } from "@/util/get-categories";

export const dynamic = "force-dynamic";

export default async function VotingCategoriesPage() {
  const event = await getCurrentEvent();
  if (!event || !isVotingOpen(event)) {
    return (
      <FeatureUnavailable
        title="Votação encerrada"
        message="A votação não está aberta no momento."
      />
    );
  }
  const session = await getGuestSession();
  if (!session) redirect("/votacao");
  if (session.eventId !== event._id) redirect("/votacao");

  const [categories, votes] = await Promise.all([
    getCategories(session.eventId),
    (await getDb())
      .collection("votes")
      .find(
        {
          eventId: new ObjectId(session.eventId),
          voterId: new ObjectId(session.userId),
        },
        { projection: { categoryId: 1 } },
      )
      .toArray(),
  ]);
  const votedCategoryIds = new Set(
    votes.map((vote) => vote.categoryId.toString()),
  );

  return (
    <section className="flex min-h-screen w-full flex-col items-center justify-center gap-8 p-8 text-center">
      <h1 className="text-5xl">
        Bem-vindo, <br />
        {session.fullName}!
      </h1>
      <p className="mt-2 text-xl text-orange-400 lg:text-2xl">
        Você pode votar na mesma pessoa em mais de uma categoria.
      </p>
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
