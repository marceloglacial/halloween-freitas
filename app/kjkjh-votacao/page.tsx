"use client";

import { useUsers } from "@/hooks/useUsers";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import VotacaoForm from "@/components/votacao/form";
import BackgroundVideo from "@/components/background-video";
import { setUserCookie } from "@/actions";

export default function PoolHome() {
  const { loading, error, getUserByEmail, user } = useUsers();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    await getUserByEmail(email);
  };

  useEffect(() => {
    if (error) toast.error(error);
  }, [user, error]);

  useEffect(() => {
    if (user) {
      setUserCookie(user).then(() => {
        router.push("/votacao/categories");
      });
    }
  }, [user, router]);

  return (
    <div className="min-h-screen w-full">
      <BackgroundVideo />
      <VotacaoForm loading={loading} onSubmit={handleSubmit} />
    </div>
  );
}
