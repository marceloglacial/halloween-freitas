import { UserCard } from "@/components/user-card";
import { getCategoryById } from "@/util/get-categories";
import { getUsers } from "@/util/get-users";

interface CategoryPageParams {
  id: string;
}

interface CategoryPageProps {
  params: CategoryPageParams;
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const awaitedParams = await params;
  const category = await getCategoryById(awaitedParams.id);

  const users = await getUsers();

  if (!category) return <>Categoria não encontrada.</>;

  return (
    <section className="min-h-screen w-screen justify-center px-8 py-16 text-center">
      <h1 className="mb-8 text-6xl">
        {category.icon}
        {category.title}
      </h1>
      <div className="mx-auto grid max-w-3xl grid-cols-4 gap-8">
        {users.map((user) => {
          return <UserCard key={user._id} user={user} />;
        })}
        {users.map((user) => {
          return <UserCard key={user._id} user={user} />;
        })}
        {users.map((user) => {
          return <UserCard key={user._id} user={user} />;
        })}
        {users.map((user) => {
          return <UserCard key={user._id} user={user} />;
        })}
      </div>
    </section>
  );
}
