"use client";

import { useState } from "react";

const PoolHome = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok && data.exists) {
        setSuccess("Login realizado com sucesso!");
      } else if (res.ok && !data.exists) {
        setError("Usuário não encontrado. Cadastre-se no site.");
      } else {
        setError(data.error || "Erro ao conectar. Tente novamente.");
      }
    } catch (err) {
      console.error(err);
      setError("Erro ao conectar. Tente novamente.");
    }
    setLoading(false);
  };

  return (
    <section className="flex h-screen w-screen flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-5xl">Halloween Dos Freitas</h1>
      <p>
        Entre com seu email. <br />
        Caso não tenha acesso, favor se cadastrar no site.
      </p>
      <form
        className="flex w-full max-w-xs flex-col gap-4"
        onSubmit={handleSubmit}
      >
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Seu email"
          className="rounded-lg border px-4 py-2 text-lg"
          required
          disabled={loading}
        />
        <button
          type="submit"
          className="rounded-lg bg-orange-600 px-4 py-2 text-lg text-white transition hover:bg-orange-700"
          disabled={loading}
        >
          {loading ? "Verificando..." : "Entrar"}
        </button>
        {error && <div className="text-sm text-red-600">{error}</div>}
        {success && <div className="text-sm text-green-600">{success}</div>}
      </form>
    </section>
  );
};
export default PoolHome;
