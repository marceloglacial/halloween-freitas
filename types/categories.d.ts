interface Category {
  _id: string;
  title: string;
  icon: string;
  order: number;
}

interface CategoryListProps {
  categories: Category[];
  loading: boolean;
  error: string | null;
}
