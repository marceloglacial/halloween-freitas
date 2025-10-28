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
}) => (
  <Link
    href={alreadyVoted ? "#" : `/votacao/categories/${category._id}`}
    key={category._id}
    className={`${firstClassname} flex items-center justify-start gap-6 rounded-xl p-4 lg:p-8 ${secondaryFont.className} text-left text-3xl ${alreadyVoted ? "cursor-not-allowed bg-gray-400 opacity-60" : "bg-purple-600"}`}
    aria-disabled={alreadyVoted}
    tabIndex={alreadyVoted ? -1 : 0}
    onClick={alreadyVoted ? (e) => e.preventDefault() : undefined}
  >
    <span className="text-4xl lg:text-6xl">{category.icon}</span>{" "}
    <span className="text-xl">{category.title}</span>
  </Link>
);

export default CategoryLink;
