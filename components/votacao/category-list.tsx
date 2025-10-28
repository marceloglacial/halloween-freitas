import { FC } from "react";
import CategoryLink from "./category-link";

interface CategoryListProps {
  categories: Category[];
  votedCategoryIds: Set<Category["_id"]>;
}

const CategoryList: FC<CategoryListProps> = async ({
  categories,
  votedCategoryIds,
}) => {
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
