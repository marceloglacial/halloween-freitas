"use client";

import React, { FC, JSX } from "react";
import { useForm } from "@/hooks/useForm";

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
          Aguarde mais informações quando a festa começar!
        </p>
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
          className="rounded-xl border border-orange-500 bg-transparent p-5 text-white placeholder:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-300"
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
          className="rounded-xl border border-orange-500 bg-transparent p-5 text-white placeholder:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-300"
          placeholder="Email"
          disabled={loading}
        />
      </label>
      <button
        type="submit"
        className="rounded-xl bg-orange-500 px-4 py-4 text-lg font-medium text-black transition hover:bg-orange-600 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-300 motion-reduce:transition-none"
        disabled={loading}
      >
        {loading ? "Enviando..." : "Enviar"}
      </button>
    </form>
  );
};

export default Form;
