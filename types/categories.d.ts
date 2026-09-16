interface Category {
  _id: string;
  eventId: string;
  title: string;
  icon: string;
  order: number;
  eligibility: "all" | "group" | "junior";
}

interface CategoryListProps {
  categories: Category[];
  loading: boolean;
  error: string | null;
}
