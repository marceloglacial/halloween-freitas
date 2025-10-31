import { fetchData } from "@/util/fetch-data";
import { secondaryFont } from "@/util/fonts";
import Link from "next/link";

export default async function Resultados() {
  const categories: Category[] = await fetchData("categories");
  return (
    <main className="mx-auto max-w-6xl px-8 py-12">
      <h1 className="mx-auto mb-8 text-center text-5xl font-bold">
        Resultados
      </h1>
      <div className="grid gap-8 lg:grid-cols-6">
        {!categories?.length && (
          <p className="mt-4">Nenhuma categoria encontrada.</p>
        )}

        {categories
          .slice()
          .reverse()
          .map((category, index) => (
            <Link
              href={`/resultados/${category._id}`}
              key={category._id}
              className={`col-span-2 ${categories.length === index + 1 && "col-start-3"} flex items-center justify-center gap-6 rounded-xl p-4 lg:p-6 ${secondaryFont.className} bg-purple-600 text-left text-3xl`}
            >
              <span className="text-4xl lg:text-6xl">{category.icon}</span>{" "}
              <span className="text-xl">{category.title}</span>
            </Link>
          ))}
      </div>
    </main>
  );
}
