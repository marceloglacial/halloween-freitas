"use client";
import Link from "next/link";
import { secondaryFont } from "@/util/fonts";
import { FC } from "react";

interface CategoryLinkProps {
  category: Category;
  alreadyVoted: boolean;
  firstClassname: string;
}

const CategoryLink: FC<CategoryLinkProps> = ({
  category,
  alreadyVoted,
  firstClassname,
}) => {
  const className = `${firstClassname} flex items-center justify-start gap-6 rounded-xl p-4 text-left lg:p-8 ${secondaryFont.className} text-3xl ${alreadyVoted ? "bg-zinc-800 opacity-75" : "bg-purple-600"}`;
  const content = (
    <>
      <span className="text-4xl lg:text-6xl">{category.icon}</span>
      <span className="flex flex-col gap-1">
        <span className="text-xl">{category.title}</span>
        <span className="font-sans text-sm" aria-hidden="true">
          {alreadyVoted ? "Concluída" : "Votar nesta categoria"}
        </span>
      </span>
      {alreadyVoted && <span className="sr-only">Categoria concluída</span>}
    </>
  );

  if (alreadyVoted) {
    return (
      <div
        key={category._id}
        role="status"
        className={className}
        aria-label={`${category.title}: concluída`}
      >
        {content}
      </div>
    );
  }

  return (
    <Link
      href={`/votacao/categories/${category._id}?eventId=${category.eventId}`}
      key={category._id}
      className={`${className} focus-visible:outline-2 focus-visible:outline-orange-300`}
    >
      {content}
    </Link>
  );
};

export default CategoryLink;
