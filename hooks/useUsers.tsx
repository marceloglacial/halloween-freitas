import { useCallback, useState } from "react";

async function responseError(response: Response, fallback: string) {
  const body = (await response.json().catch(() => null)) as {
    error?: string;
  } | null;
  return body?.error || fallback;
}

export function useUsers(eventId: string) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [showModal, setShowModal] = useState(false);
  const [modalUser, setModalUser] = useState<Partial<AdminUser>>({});

  const fetchUsers = useCallback(
    async function fetchUsers() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(
          `/api/admin/users?eventId=${encodeURIComponent(eventId)}`,
        );
        if (!res.ok) {
          throw new Error(
            await responseError(
              res,
              "Não foi possível carregar os convidados.",
            ),
          );
        }
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
            : "Não foi possível carregar os convidados.",
        );
      } finally {
        setLoading(false);
      }
    },
    [eventId],
  );

  async function handleEdit(user: Partial<User>) {
    setError("");
    try {
      setLoading(true);
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...user, eventId }),
      });
      if (!res.ok) {
        throw new Error(
          await responseError(
            res,
            "Não foi possível atualizar o participante.",
          ),
        );
      }
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
          : "Não foi possível atualizar o participante.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(_id: string) {
    setError("");
    const participant = users.find((user) => user._id === _id);
    if (
      !window.confirm(
        `Excluir ${participant?.fullName ?? "este participante"}? A ação não pode ser desfeita.`,
      )
    )
      return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _id, eventId }),
      });
      if (!res.ok) {
        throw new Error(
          await responseError(res, "Não foi possível excluir o participante."),
        );
      }
      setUsers((prev: User[]) => prev.filter((u: User) => u._id !== _id));
    } catch (err: unknown) {
      setError(
        typeof err === "object" &&
          err &&
          "message" in err &&
          typeof (err as { message?: unknown }).message === "string"
          ? (err as { message: string }).message
          : "Não foi possível excluir o participante.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleResetAccess(user: Partial<AdminUser>) {
    const saved = users.find((entry) => entry._id === user._id);
    if (
      !saved?.clerkUserId ||
      !window.confirm(
        `Redefinir o acesso de ${saved.fullName} (${saved.email})? Depois, o convidado deverá verificar esse email novamente. Corrija e salve o email antes de redefinir se a conta anterior não deve recuperar o acesso.`,
      )
    )
      return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/users/access-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          userId: saved._id,
          expectedClerkUserId: saved.clerkUserId,
        }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Não foi possível redefinir o acesso.");
      }
      setUsers((previous) =>
        previous.map((entry) =>
          entry._id === saved._id
            ? { ...entry, clerkUserId: undefined }
            : entry,
        ),
      );
      setShowModal(false);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Erro de conexão. Tente novamente.",
      );
    } finally {
      setLoading(false);
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

  function openEditModal(user?: AdminUser | null) {
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
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...user, eventId }),
      });
      if (!res.ok) {
        throw new Error(
          await responseError(
            res,
            "Não foi possível adicionar o participante.",
          ),
        );
      }
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
          : "Não foi possível adicionar o participante.",
      );
    } finally {
      setLoading(false);
    }
  }

  const closeModal = useCallback(function closeModal() {
    setShowModal(false);
    setModalUser({});
    setError("");
  }, []);

  return {
    closeModal,
    error,
    fetchUsers,
    filteredUsers,
    handleDelete,
    handleEdit,
    handleCreate,
    handleResetAccess,
    loading,
    modalUser,
    openEditModal,
    search,
    setModalUser,
    setSearch,
    setShowModal,
    showModal,
    users,
  };
}
