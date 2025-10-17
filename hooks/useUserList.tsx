import { useState, useMemo, useEffect } from "react";

export function useUserList() {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [showModal, setShowModal] = useState(false);
  const [modalUser, setModalUser] = useState<Partial<User>>({});

  useEffect(() => {
    fetchUsers();
  }, []);

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

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u: User) =>
      [u.fullName, u.email]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(q)),
    );
  }, [search, users]);

  function openEditModal(user: User) {
    setModalUser(user);
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setModalUser({});
    setError("");
  }

  return {
    users,
    search,
    setSearch,
    loading,
    error,
    showModal,
    modalUser,
    setModalUser,
    setShowModal,
    filteredUsers,
    fetchUsers,
    handleEdit,
    handleDelete,
    openEditModal,
    closeModal,
  };
}
