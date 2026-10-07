"use client";

import React, { FC, JSX } from "react";
import { useForm } from "@/hooks/useForm";
import Link from "next/link";

const Form: FC = (): JSX.Element => {
  const { loading, confirmed, handleSubmit } = useForm();
  if (confirmed)
    return (
      <div
        role="status"
        className="grid gap-4 rounded-2xl border border-orange-400 p-6 text-center"
      >
        <p className="text-xl text-orange-300">Presença confirmada! 🎃</p>
        <p>
          Você já está inscrito. Não precisa entrar nem verificar seu email para
          confirmar presença.
        </p>
        <Link href="/votacao" className="text-orange-300 underline">
          Acessar votação quando estiver aberta
        </Link>
      </div>
    );
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
          aria-label="Nome e sobrenome"
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
          aria-label="Email"
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
