import { notFound, redirect } from "next/navigation";
import BackButton from "@/components/back-button";
import VoteGrid from "@/components/votacao/vote-grid";
import { getGuestSession } from "@/lib/auth/guest-session";
import { getPublicUsersForEvent } from "@/lib/users";
import { getCategoryById } from "@/util/get-categories";
import { isEligibleCandidate } from "@/lib/voting";

export const dynamic = "force-dynamic";

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getGuestSession();
  if (!session) redirect("/votacao");

  const category = await getCategoryById((await params).id);
  if (!category || category.eventId !== session.eventId) notFound();

  const users = (await getPublicUsersForEvent(session.eventId)).filter((user) =>
    isEligibleCandidate(category, user, session.userId),
  );

  return (
    <section className="min-h-screen w-full px-8 py-16 text-center">
      <BackButton href="/votacao/categories" />
      <h1 className="mt-8 mb-8 text-4xl lg:text-6xl">
        {category.icon} {category.title}
      </h1>
      <VoteGrid users={users} categoryId={category._id} />
    </section>
  );
}
