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
  const [error, setError] = useState("");

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        `/api/admin/users?eventId=${encodeURIComponent(eventId)}`,
        { cache: "no-store" },
      );
      if (!response.ok) {
        throw new Error(
          await responseError(
            response,
            "Não foi possível carregar os convidados.",
          ),
        );
      }
      setUsers((await response.json()) as AdminUser[]);
    } catch (failure) {
      setUsers([]);
      setError(
        failure instanceof Error
          ? failure.message
          : "Não foi possível carregar os convidados.",
      );
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  const query = search.trim().toLocaleLowerCase("pt-BR");
  const filteredUsers = query
    ? users.filter((user) =>
        [user.fullName, user.email].some((field) =>
          field.toLocaleLowerCase("pt-BR").includes(query),
        ),
      )
    : users;

  return {
    error,
    fetchUsers,
    filteredUsers,
    loading,
    search,
    setSearch,
    users,
  };
}
