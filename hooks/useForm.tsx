"use client";

import { useState } from "react";
import { toast } from "sonner";

export function useForm() {
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const handleSubmit = async (e: FormSubmitEvent) => {
    e.preventDefault();
    setLoading(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const fullName = formData.get("fullName") as string;
    const email = formData.get("email") as string;
    try {
      const res = await fetch("/api/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email }),
      });
      const data: unknown = await res.json().catch(() => null);
      if (res.ok) {
        toast.success("Inscrição realizada com sucesso!");
        setConfirmed(true);
        form.reset();
      } else {
        toast.error(
          data !== null &&
            typeof data === "object" &&
            "error" in data &&
            typeof data.error === "string"
            ? data.error
            : "Ocorreu um erro. Tente novamente.",
        );
      }
    } catch {
      toast.error("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return { loading, confirmed, handleSubmit };
}
