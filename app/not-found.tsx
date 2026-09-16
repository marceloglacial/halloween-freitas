import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-5xl">Página não encontrada</h1>
      <Link className="rounded-xl bg-orange-500 px-5 py-3 text-black" href="/">
        Voltar ao início
      </Link>
    </main>
  );
}
