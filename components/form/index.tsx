"use client";

import React, { FC, JSX } from "react";
import { toast } from "sonner";

const Form: FC = (): JSX.Element => {
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const fullName = formData.get("fullName") as string;
    const email = formData.get("email") as string;
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
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

  return (
    <form
      className="mx-auto grid w-full max-w-sm gap-8"
      autoComplete="off"
      onSubmit={handleSubmit}
    >
      <label className="flex flex-col gap-1">
        <input
          type="text"
          name="fullName"
          required
          className="rounded-xl border border-orange-500 bg-transparent p-5 text-white placeholder:text-white focus:ring-0 focus:outline-none"
          placeholder="Nome e Sobrenome"
          disabled={loading}
        />
      </label>
      <label className="flex flex-col gap-1">
        <input
          type="email"
          name="email"
          required
          className="rounded-xl border border-orange-500 bg-transparent p-5 text-white placeholder:text-white focus:ring-0 focus:outline-none"
          placeholder="Email"
          disabled={loading}
        />
      </label>
      <button
        type="submit"
        className="rounded-xl bg-orange-500 px-4 py-4 text-lg font-medium text-black transition hover:bg-orange-600"
        disabled={loading}
      >
        {loading ? "Enviando..." : "Enviar"}
      </button>
    </form>
  );
};

export default Form;
