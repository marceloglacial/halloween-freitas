export default function AdminDashboardLoading() {
  return (
    <section
      aria-busy="true"
      aria-label="Carregando painel administrativo"
      className="grid min-h-64 content-center gap-4 rounded-2xl border border-white/10 bg-stone-900/80 p-6 sm:p-8"
    >
      <p role="status" className="text-sm text-gray-300">
        Carregando painel administrativo…
      </p>
      <div className="h-8 w-2/3 animate-pulse rounded-lg bg-white/10 motion-reduce:animate-none" />
      <div className="h-24 animate-pulse rounded-xl bg-white/5 motion-reduce:animate-none" />
    </section>
  );
}
