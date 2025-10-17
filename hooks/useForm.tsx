"use client";

import { useState } from "react";
import { toast } from "sonner";

export function useForm() {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormSubmitEvent) => {
    e.preventDefault();
    setLoading(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const fullName = formData.get("fullName") as string;
    const email = formData.get("email") as string;
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email }),
      });
      const data = await res.json();
      if (res.ok && data._id) {
        toast.success("Inscrição realizada com sucesso!");
        form.reset();
      } else if (data.error === "User already exists") {
        toast.error("Este email já está inscrito.");
      } else {
        toast.error("Ocorreu um erro. Tente novamente.");
      }
    } catch {
      toast.error("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return { loading, handleSubmit };
}
