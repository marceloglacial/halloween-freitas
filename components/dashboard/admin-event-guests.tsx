import UserList from "@/components/dashboard/user-list";

export default function AdminEventGuests({
  event,
  now,
}: {
  event: HalloweenEvent;
  now: string;
}) {
  return (
    <section className="space-y-5">
      <header className="rounded-2xl border border-white/10 bg-stone-950/80 p-5 sm:p-6">
        <h1 className="text-4xl text-orange-300 sm:text-5xl">Convidados</h1>
        {event.status === "archived" && (
          <p className="mt-3 rounded-lg border border-amber-300/20 bg-amber-300/5 p-3 text-sm text-amber-100">
            Edição arquivada. Você pode consultar e corrigir convidados; novas
            inclusões e exclusões seguem bloqueadas pelas regras da edição.
          </p>
        )}
      </header>
      <UserList event={event} now={now} />
    </section>
  );
}
