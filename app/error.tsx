"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-4xl">Algo deu errado</h1>
      <p className="max-w-md text-white/70">
        Não foi possível carregar esta página. Tente novamente em instantes.
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-xl bg-orange-500 px-5 py-3 font-medium text-black"
      >
        Tentar novamente
      </button>
    </main>
  );
}
