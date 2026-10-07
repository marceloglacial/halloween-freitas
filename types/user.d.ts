type User = {
  _id: string;
  eventId: string;
  fullName: string;
  email: string;
  imageUrl?: string | null;
  group?: boolean;
  junior?: boolean;
  status?: "confirmed" | "cancelled";
};

type PublicUser = Omit<User, "email" | "status">;
type AdminUser = User & { clerkUserId?: string };

interface UserListItemProps {
  user: User;
  openEditModal: (user: User) => void;
  handleDelete: (id: string) => void;
}

interface UserEditModalProps {
  showModal: boolean;
  modalUser: Partial<AdminUser>;
  setModalUser: (u: Partial<AdminUser>) => void;
  handleEdit: (user: Partial<User>) => void;
  closeModal: () => void;
  loading: boolean;
  error?: string;
}

interface UserListSearchProps {
  search: string;
  setSearch: (value: string) => void;
  onSearch?: (value: string) => void;
}

type UserWithVotes = {
  votes: number;
} & PublicUser;
