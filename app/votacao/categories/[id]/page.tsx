import BackButton from "@/components/back-button";
import { fetchData } from "@/util/fetch-data";
import VoteGrid from "@/components/votacao/vote-grid";
import { cookies } from "next/headers";

interface CategoryPageParams {
  id: string;
}

interface CategoryPageProps {
  params: CategoryPageParams;
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { id } = await params;
  const category: Category = await fetchData(`categories/${id}`);
  const users: User[] = await fetchData("users");

  if (!category) return <>Categoria não encontrada.</>;
  if (!users) return <>Erro ao carregar os usuários.</>;

  // Get user from cookies
  const cookieStore = await cookies();
  const userCookie = cookieStore.get("user");
  const user: User = userCookie ? JSON.parse(userCookie.value) : null;

  // Filter group
  const isGroup = category.title?.toLowerCase().includes("grupo");
  const isJunior = category.title?.toLowerCase().includes("j");
  const allUsers: User[] = users.filter((u) => {
    if (isGroup) return !!u.group === isGroup;
    if (isJunior) return !!u.junior === isJunior;
    return u;
  });

  return (
    <section className="min-h-screen w-screen justify-center px-8 py-16 text-center">
      <BackButton href="/votacao/categories" />
      <h1 className="mt-8 mb-8 text-4xl lg:text-6xl">
        {category.icon} {category.title}
      </h1>
      <VoteGrid user={user} users={allUsers} categoryId={category._id} />
    </section>
  );
}
