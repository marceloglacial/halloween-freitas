type User = {
  _id: string;
  fullName: string;
  email: string;
  imageUrl?: string;
  group?: boolean;
};

interface UserListItemProps {
  user: User;
  openEditModal: (user: User) => void;
  handleDelete: (id: string) => void;
}

interface UserEditModalProps {
  showModal: boolean;
  modalUser: Partial<User>;
  setModalUser: (u: Partial<User>) => void;
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
