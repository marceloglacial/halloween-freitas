interface Category {
  _id: string;
  title: string;
  icon: string;
}

interface CategoryListProps {
  categories: Category[];
  loading: boolean;
  error: string | null;
}
