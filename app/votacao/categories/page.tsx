import CategoryList from "@/components/votacao/category-list";
import { fetchData } from "@/util/fetch-data";
import { cookies } from "next/headers";

export default async function PoolHome() {
  const cookieStore = await cookies();
  const userCookie = cookieStore.get("user");
  let user = { _id: "", fullName: "", email: "", imageUrl: undefined };
  if (userCookie?.value) {
    try {
      user = JSON.parse(userCookie.value);
    } catch {}
  }
  const categories: Category[] = await fetchData("categories");
  if (!categories.length) return <p>Nenhuma categoria encontrada.</p>;

  const votes: Vote[] = user._id
    ? await fetchData(`votes?voterId=${user._id}`)
    : [];
  const votedCategoryIds = new Set(
    votes.map((v) => v.categoryId?.toString?.() || v.categoryId),
  );

  return (
    <section className="mmin-h-screen flex w-screen flex-col items-center justify-center gap-8 p-8 text-center">
      <h1 className="text-5xl">
        Bem-vindo, <br />
        {user.fullName}!
      </h1>
      <p className="mt-2 text-xl text-orange-400 lg:text-2xl">
        ATENÇÃO: Você pode votar na mesma pessoa em mais de uma categoria.
      </p>
      <CategoryList
        categories={categories}
        votedCategoryIds={votedCategoryIds}
      />
    </section>
  );
}
