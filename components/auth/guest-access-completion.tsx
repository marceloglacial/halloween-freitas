"use client";

import { useCallback, useEffect, useState } from "react";
import { useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { guestAccessUrl } from "@/util/guest-access";

export default function GuestAccessCompletion({
  eventId,
  returnTo,
  registrationOpen,
}: {
  eventId: string;
  returnTo: string;
  registrationOpen: boolean;
}) {
  const router = useRouter();
  const clerk = useClerk();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const verify = useCallback(
    async (signal?: AbortSignal) => {
      const response = await fetch("/api/guest-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId }),
        signal,
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Não foi possível verificar seu acesso.");
      if (!signal?.aborted) {
        router.replace(returnTo);
        router.refresh();
      }
    },
    [eventId, returnTo, router],
  );
  const reportFailure = (failure: unknown) => {
    setError(
      failure instanceof Error
        ? failure.message
        : "Erro de conexão. Tente novamente.",
    );
    setLoading(false);
  };
  useEffect(() => {
    const controller = new AbortController();
    void verify(controller.signal).catch((failure) => {
      if (!controller.signal.aborted) reportFailure(failure);
    });
    return () => controller.abort();
  }, [verify]);
  return (
    <div className="grid w-full gap-4">
      {loading ? (
        <p role="status">Verificando seu acesso...</p>
      ) : (
        <>
          <p role="alert" className="text-orange-300">
            {error}
          </p>
          <button
            type="button"
            className="rounded-xl bg-orange-400 p-3 text-black focus-visible:outline-2"
            onClick={() => {
              setError("");
              setLoading(true);
              void verify().catch(reportFailure);
            }}
          >
            Tentar novamente
          </button>
          <button
            type="button"
            className="rounded-xl border border-orange-400 p-3 focus-visible:outline-2"
            onClick={async () => {
              setLoading(true);
              try {
                await clerk.signOut({
                  redirectUrl: guestAccessUrl(eventId, returnTo),
                });
              } catch {
                setError("Não foi possível trocar de conta. Tente novamente.");
                setLoading(false);
              }
            }}
          >
            Usar outro email ou receber código por email
          </button>
          {registrationOpen && (
            <Link href="/#confirmacao" className="text-orange-300 underline">
              Ainda não confirmou? Confirmar presença
            </Link>
          )}
          <p className="text-sm">
            Entrar não confirma nem altera sua presença. Se precisar corrigir um
            vínculo, entre em contato com o anfitrião.
          </p>
        </>
      )}
    </div>
  );
}
