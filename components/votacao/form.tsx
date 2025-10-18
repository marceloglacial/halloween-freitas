import Link from "next/link";
import React from "react";

interface VotacaoFormProps {
  loading: boolean;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}

export default function VotacaoForm({ loading, onSubmit }: VotacaoFormProps) {
  const loadingClassname = loading
    ? "cursor-not-allowed bg-green-400"
    : "cursor-pointer bg-orange-600";
  return (
    <section className="flex min-h-screen w-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-7xl lg:text-8xl">
        Halloween <br />
        Dos Freitas
      </h1>
      <p className="rounded-xl bg-black/50 p-8 lg:text-2xl">
        Entre com seu email. <br />
        Caso não tenha acesso, favor{" "}
        <Link href={"/"} className="text-green-400 underline">
          se cadastrar no site
        </Link>
        .
      </p>
      <form className="flex w-full max-w-xs flex-col gap-4" onSubmit={onSubmit}>
        <input
          type="email"
          name="email"
          placeholder="Seu email"
          className="rounded-lg border bg-black/70 px-4 py-2 lg:text-lg"
          required
        />
        <button
          type="submit"
          className={`rounded-lg px-4 py-2 text-white transition hover:bg-orange-700 lg:text-lg ${loadingClassname}`}
          disabled={loading}
        >
          {loading ? "Entrando ..." : "Entrar"}
        </button>
      </form>
    </section>
  );
}
