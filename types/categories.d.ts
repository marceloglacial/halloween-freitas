interface Category {
  _id: string;
  eventId: string;
  title: string;
  icon: string;
  order: number;
  eligibility: "all" | "group";
}

interface CategoryListProps {
  categories: Category[];
  loading: boolean;
  error: string | null;
}
