"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import VotacaoForm from "@/components/votacao/form";
import BackgroundVideo from "@/components/background-video";

export default function VotingLoginPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    try {
      const email = new FormData(event.currentTarget).get("email");
      const response = await fetch("/api/guest-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Não foi possível entrar");
      router.push("/votacao/categories");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro de conexão");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full">
      <BackgroundVideo />
      <VotacaoForm loading={loading} onSubmit={handleSubmit} />
    </div>
  );
}
