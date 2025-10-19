import BackButton from "@/components/back-button";
import { UserCard } from "@/components/user-card";
import { fetchData } from "@/util/fetch-data";

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

  return (
    <section className="min-h-screen w-screen justify-center px-8 py-16 text-center">
      <BackButton href="/votacao/categories" />
      <h1 className="mb-8 text-6xl">
        {category.icon}
        {category.title}
      </h1>
      <div className="mx-auto grid max-w-3xl grid-cols-4 gap-8">
        {users.map((user) => {
          return <UserCard key={user._id} user={user} />;
        })}
      </div>
    </section>
  );
}
