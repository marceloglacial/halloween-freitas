"use client";

import { useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export default function LogoutButton({
  className = "rounded-lg bg-red-700 px-4 py-2 hover:bg-red-600 disabled:cursor-wait disabled:opacity-60",
}: {
  className?: string;
}) {
  const { signOut } = useClerk();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    if (loading) return;
    setLoading(true);
    try {
      await signOut();
      router.replace("/");
      router.refresh();
    } catch (error) {
      console.error("Sign out failed", error);
      toast.error("Não foi possível sair. Tente novamente.");
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      disabled={loading}
      onClick={handleLogout}
      className={className}
    >
      {loading ? "Saindo..." : "Sair"}
    </button>
  );
}
