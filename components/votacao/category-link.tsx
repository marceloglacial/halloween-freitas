"use client";
import Link from "next/link";
import { secondaryFont } from "@/util/fonts";
import { FC } from "react";

interface CategoryLinkProps {
  category: Category;
  alreadyVoted: boolean;
  availableInRound: boolean;
  firstClassname: string;
}

const CategoryLink: FC<CategoryLinkProps> = ({
  category,
  alreadyVoted,
  availableInRound,
  firstClassname,
}) => {
  const unavailable = !availableInRound;
  const className = `${firstClassname} flex items-center justify-start gap-6 rounded-xl p-4 text-left lg:p-8 ${secondaryFont.className} text-3xl ${alreadyVoted || unavailable ? "bg-zinc-800 opacity-75" : "bg-purple-600"}`;
  const status = alreadyVoted
    ? "Concluída"
    : unavailable
      ? "Fora desta rodada"
      : "Votar nesta categoria";
  const content = (
    <>
      <span className="text-4xl lg:text-6xl">{category.icon}</span>
      <span className="flex flex-col gap-1">
        <span className="text-xl">{category.title}</span>
        <span className="font-sans text-sm" aria-hidden="true">
          {status}
        </span>
      </span>
      {(alreadyVoted || unavailable) && (
        <span className="sr-only">
          {alreadyVoted ? "Categoria concluída" : "Categoria fora desta rodada"}
        </span>
      )}
    </>
  );

  if (alreadyVoted || unavailable) {
    return (
      <div
        key={category._id}
        role="status"
        className={className}
        aria-label={`${category.title}: ${status.toLocaleLowerCase("pt-BR")}`}
      >
        {content}
      </div>
    );
  }

  return (
    <Link
      href={`/meu-halloween/votacao/categories/${category._id}?eventId=${category.eventId}`}
      key={category._id}
      className={`${className} focus-visible:outline-2 focus-visible:outline-orange-300`}
    >
      {content}
    </Link>
  );
};

export default CategoryLink;
