"use client";
import { useCategories } from "@/hooks/useCategories";
import { secondaryFont } from "@/util/fonts";
import Link from "next/link";
import { FC } from "react";

const CategoryList: FC = () => {
  const { categories, loading, error } = useCategories();

  if (loading) return <p>Carregando categorias...</p>;
  if (error) return <p className="text-red-500">Erro: {error}</p>;
  if (!categories.length) return <p>Nenhuma categoria encontrada.</p>;

  return (
    <div className="grid max-w-3xl gap-8 lg:grid-cols-2">
      {categories.map((category, index) => {
        const firstClassname =
          index === 0 ? `lg:col-span-2 lg:max-w-fit lg:mx-auto` : "";
        return (
          <Link
            href={`/votacao/${category._id}`}
            key={category._id}
            className={`${firstClassname} flex items-center justify-start gap-6 rounded-xl bg-purple-600 p-8 ${secondaryFont.className} text-left text-3xl`}
          >
            <span className="text-6xl">{category.icon}</span> {category.title}
          </Link>
        );
      })}
    </div>
  );
};

export default CategoryList;
