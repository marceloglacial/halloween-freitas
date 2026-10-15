import Link from "next/link";

export default function AdminSectionPlaceholder({
  title,
  message,
  action,
}: {
  title: string;
  message: string;
  action?: { href: string; label: string };
}) {
  return (
    <section className="grid min-h-64 content-center justify-items-start gap-4 rounded-2xl border border-white/10 bg-stone-900/80 p-6 sm:p-8">
      <p className="text-xs font-semibold tracking-[0.18em] text-orange-300 uppercase">
        Halloween Admin
      </p>
      <h2 className="text-3xl font-semibold">{title}</h2>
      <p className="max-w-2xl leading-7 text-gray-300">{message}</p>
      {action && (
        <Link
          href={action.href}
          className="mt-2 inline-flex min-h-11 items-center rounded-lg bg-orange-500 px-5 py-2 font-semibold text-black transition hover:bg-orange-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300 motion-reduce:transition-none"
        >
          {action.label}
        </Link>
      )}
    </section>
  );
}
