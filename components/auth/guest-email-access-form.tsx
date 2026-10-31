"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function GuestEmailAccessForm({ eventId, returnTo }: { eventId: string; returnTo: string }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const router = useRouter();
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError("");
    try {
      const response = await fetch("/api/guest-access", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventId, email }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Não foi possível acessar.");
      router.push(returnTo);
      router.refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível acessar."); }
    finally { setPending(false); }
  }
  return <form onSubmit={submit} className="w-full space-y-4 text-left">
    <label className="block">Email da confirmação<input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2 w-full rounded-lg border border-orange-300/40 bg-black/30 px-4 py-3" /></label>
    {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
    <button disabled={pending} className="w-full rounded-lg bg-orange-500 px-4 py-3 font-semibold text-black disabled:opacity-60">{pending ? "Acessando..." : "Acessar Meu Halloween"}</button>
  </form>;
}
