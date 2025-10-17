"use client";

import { useUsers } from "@/hooks/useUsers";
import { useEffect } from "react";
import { toast } from "sonner";
import VotacaoForm from "@/components/votacao/form";
import Candidates from "@/components/votacao/candidates";
import BackgroundVideo from "@/components/background-video";

export default function PoolHome() {
  const { loading, error, getUserByEmail, user } = useUsers();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    await getUserByEmail(email);
  };

  useEffect(() => {
    if (error) toast.error(error);
  }, [user, error]);

  if (user) return <Candidates user={user} />;

  return (
    <>
      <BackgroundVideo />
      <VotacaoForm loading={loading} onSubmit={handleSubmit} />;
    </>
  );
}
