import { FC } from "react";
import { fetchData } from "@/util/fetch-data";
import CategoryLink from "./category-link";

interface CategoryListProps {
  userID: User["_id"];
  categories: Category[];
}

const CategoryList: FC<CategoryListProps> = async ({ userID, categories }) => {
  // Fetch votes for this user
  type Vote = { categoryId: string };
  const votes: Vote[] = userID
    ? await fetchData(`votes?voterId=${userID}`)
    : [];
  const votedCategoryIds = new Set(
    votes.map((v) => v.categoryId?.toString?.() || v.categoryId),
  );

  return (
    <div className="grid max-w-3xl gap-8 lg:grid-cols-2">
      {categories.map((category, index) => {
        const firstClassname =
          index === 0 ? `lg:col-span-2 lg:max-w-fit lg:mx-auto` : "";
        const alreadyVoted = votedCategoryIds.has(category._id);
        return (
          <CategoryLink
            key={category._id}
            category={category}
            alreadyVoted={alreadyVoted}
            firstClassname={firstClassname}
          />
        );
      })}
    </div>
  );
};

export default CategoryList;
