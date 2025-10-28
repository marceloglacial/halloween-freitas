import { useState } from "react";

export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [showModal, setShowModal] = useState(false);
  const [modalUser, setModalUser] = useState<Partial<User>>({});

  async function fetchUsers() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      setUsers(data);
    } catch (err: unknown) {
      setUsers([]);
      setError(
        typeof err === "object" &&
          err &&
          "message" in err &&
          typeof (err as { message?: unknown }).message === "string"
          ? (err as { message: string }).message
          : "Error fetching users",
      );
    } finally {
      setLoading(false);
    }
  }

  async function getUserByEmail(email: string) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/users?email=${encodeURIComponent(email)}`);
      if (!res.ok) throw new Error("Usuário não encontrado!");
      const data = await res.json();
      if (Array.isArray(data)) {
        setUser(data[0]);
      }
      setUser(data || null);
    } catch (err: unknown) {
      setError(
        typeof err === "object" &&
          err &&
          "message" in err &&
          typeof (err as { message?: unknown }).message === "string"
          ? (err as { message: string }).message
          : "Erro de conexão!",
      );
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleEdit(user: Partial<User>) {
    setError("");
    try {
      setLoading(true);
      const res = await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(user),
      });
      if (!res.ok) throw new Error("Failed to update user");
      const updated = await res.json();
      setUsers((prev: User[]) =>
        prev.map((u: User) =>
          u._id === updated._id ? { ...u, ...updated } : u,
        ),
      );
      setShowModal(false);
    } catch (err: unknown) {
      setError(
        typeof err === "object" &&
          err &&
          "message" in err &&
          typeof (err as { message?: unknown }).message === "string"
          ? (err as { message: string }).message
          : "Error updating user",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(_id: string) {
    setError("");
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      const res = await fetch("/api/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _id }),
      });
      if (!res.ok) throw new Error("Failed to delete user");
      setUsers((prev: User[]) => prev.filter((u: User) => u._id !== _id));
    } catch (err: unknown) {
      setError(
        typeof err === "object" &&
          err &&
          "message" in err &&
          typeof (err as { message?: unknown }).message === "string"
          ? (err as { message: string }).message
          : "Error deleting user",
      );
    }
  }

  const q = search.trim().toLowerCase();
  const filteredUsers = !q
    ? users
    : users.filter((u: User) =>
        [u.fullName, u.email]
          .filter(Boolean)
          .some((field) => field!.toLowerCase().includes(q)),
      );

  function openEditModal(user?: User | null) {
    if (user) {
      setModalUser(user);
    } else {
      setModalUser({});
    }
    setShowModal(true);
  }
  async function handleCreate(user: Partial<User>) {
    setError("");
    try {
      setLoading(true);
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(user),
      });
      if (!res.ok) throw new Error("Failed to create user");
      const created = await res.json();
      setUsers((prev: User[]) => [...prev, created]);
      setShowModal(false);
    } catch (err: unknown) {
      setError(
        typeof err === "object" &&
          err &&
          "message" in err &&
          typeof (err as { message?: unknown }).message === "string"
          ? (err as { message: string }).message
          : "Error creating user",
      );
    } finally {
      setLoading(false);
    }
  }

  function closeModal() {
    setShowModal(false);
    setModalUser({});
    setError("");
  }

  return {
    closeModal,
    error,
    fetchUsers,
    filteredUsers,
    getUserByEmail,
    handleDelete,
    handleEdit,
    handleCreate,
    loading,
    modalUser,
    openEditModal,
    search,
    setModalUser,
    setSearch,
    setShowModal,
    setUser,
    showModal,
    user,
    users,
  };
}
