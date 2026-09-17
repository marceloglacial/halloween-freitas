import Link from "next/link";

export default function FeatureUnavailable({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-5xl">{title}</h1>
      <p className="max-w-xl text-xl text-orange-400">{message}</p>
      <Link className="rounded-xl bg-orange-500 px-5 py-3 text-black" href="/">
        Voltar ao início
      </Link>
    </main>
  );
}
