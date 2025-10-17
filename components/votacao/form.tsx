import React from "react";

interface VotacaoFormProps {
  loading: boolean;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}

export default function VotacaoForm({ loading, onSubmit }: VotacaoFormProps) {
  return (
    <section className="flex h-screen w-screen flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-5xl">Halloween Dos Freitas</h1>
      <p>
        Entre com seu email. <br />
        Caso não tenha acesso, favor se cadastrar no site.
      </p>
      <form className="flex w-full max-w-xs flex-col gap-4" onSubmit={onSubmit}>
        <input
          type="email"
          name="email"
          placeholder="Seu email"
          className="rounded-lg border px-4 py-2 text-lg"
          required
        />
        <button
          type="submit"
          className={`rounded-lg bg-orange-600 px-4 py-2 text-lg text-white transition hover:bg-orange-700 ${loading ? "cursor-not-allowed opacity-50" : ""}`}
          disabled={loading}
        >
          {loading ? "Entrando" : "Entrar"}
        </button>
      </form>
    </section>
  );
}
