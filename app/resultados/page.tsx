import { fetchData } from "@/util/fetch-data";
import { secondaryFont } from "@/util/fonts";
import Link from "next/link";

export default async function Resultados() {
  const categories: Category[] = await fetchData("categories");
  return (
    <main className="mx-auto max-w-2xl px-8 py-12">
      <h1 className="mb-8 text-3xl font-bold">Resultados</h1>
      <div className="grid gap-8">
        {!categories?.length && (
          <p className="mt-4">Nenhuma categoria encontrada.</p>
        )}

        {categories.map((category) => (
          <Link
            href={`/resultados/${category._id}`}
            key={category._id}
            className={`flex items-center justify-start gap-6 rounded-xl p-4 lg:p-6 ${secondaryFont.className} bg-purple-600 text-left text-3xl`}
          >
            <span className="text-4xl lg:text-6xl">{category.icon}</span>{" "}
            <span className="text-xl">{category.title}</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
