import { fetchData } from "@/util/fetch-data";
import { secondaryFont } from "@/util/fonts";
import Link from "next/link";
import { FC } from "react";

const CategoryList: FC = async () => {
  const categories: Category[] = await fetchData("categories");

  if (!categories.length) return <p>Nenhuma categoria encontrada.</p>;

  return (
    <div className="grid max-w-3xl gap-8 lg:grid-cols-2">
      {categories.map((category, index) => {
        const firstClassname =
          index === 0 ? `lg:col-span-2 lg:max-w-fit lg:mx-auto` : "";
        return (
          <Link
            href={`/votacao/categories/${category._id}`}
            key={category._id}
            className={`${firstClassname} flex items-center justify-start gap-6 rounded-xl bg-purple-600 p-4 lg:p-8 ${secondaryFont.className} text-left text-3xl`}
          >
            <span className="text-4xl lg:text-6xl">{category.icon}</span>{" "}
            <span className="text-xl">{category.title}</span>
          </Link>
        );
      })}
    </div>
  );
};

export default CategoryList;
