"use client";

import { createContext, ReactNode, useContext } from "react";

const HomeCategoriesContext = createContext<Category[]>([]);

export function HomeCategoriesProvider({
  categories,
  children,
}: {
  categories: Category[];
  children: ReactNode;
}) {
  return (
    <HomeCategoriesContext.Provider value={categories}>
      {children}
    </HomeCategoriesContext.Provider>
  );
}

export function useHomeCategories() {
  return useContext(HomeCategoriesContext);
}
