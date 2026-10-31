export default function AdminAccessDenied() {
  return (
    <section
      role="alert"
      className="rounded-2xl border border-red-400/30 bg-red-950/30 p-6 sm:p-8"
    >
      <h1 className="text-2xl font-semibold">Acesso restrito</h1>
      <p className="mt-3 max-w-2xl text-gray-200">
        Esta área é reservada aos administradores. Sua sessão de convidado
        continua ativa.
      </p>
    </section>
  );
}
