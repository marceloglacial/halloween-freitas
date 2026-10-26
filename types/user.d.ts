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
  openEditModal: (user: User) => void;
  handleDelete: (id: string) => void;
  canDelete: boolean;
  disabledDescriptionId: string;
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
