type User = {
  _id: string;
  eventId: string;
  fullName: string;
  email: string;
  imageUrl?: string | null;
  contestant?: boolean;
  group?: boolean;
  status?: "confirmed" | "cancelled";
};

type PublicUser = Omit<User, "email" | "status" | "contestant">;
type AdminUser = User & { clerkUserId?: string };

interface UserListItemProps {
  user: User;
  year: number;
}

interface UserListSearchProps {
  search: string;
  setSearch: (value: string) => void;
  onSearch?: (value: string) => void;
}

type UserWithVotes = {
  votes: number;
} & PublicUser;
