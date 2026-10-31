import Link from "next/link";
import {
  getActiveEvent,
  getEventById,
} from "@/lib/events";
import FeatureUnavailable from "@/components/feature-unavailable";
import GuestEmailAccessForm from "@/components/auth/guest-email-access-form";
import {
  guestReturnPath,
  validGuestEventId,
} from "@/util/guest-access";

type AccessQuery = { eventId?: string; returnTo?: string };

export default async function GuestAccessPage({
  searchParams,
  mode = "sign-in",
}: {
  searchParams: Promise<AccessQuery>;
  mode?: "sign-in" | "sign-up" | "complete";
}) {
  const query = await searchParams;
  const event = validGuestEventId(query.eventId)
    ? await getEventById(query.eventId)
    : await getActiveEvent();
  if (!event)
    return (
      <FeatureUnavailable
        title="Acesso indisponível"
        message="Não há uma edição ativa disponível para entrar agora."
      />
    );
  const returnTo = guestReturnPath(query.returnTo, event._id);
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-6 px-4 py-12 text-center">
      <h1 className="text-4xl">Acesso de convidados</h1>
      <p>
        {event.title} · {event.year}
      </p>
      <p>Informe o email usado na confirmação de presença para acessar seu espaço e as ações de convidado.</p>
      <p className="text-sm text-orange-300">O acesso é feito pelo email informado e não exige conta ou confirmação pelo Clerk.</p>
      <GuestEmailAccessForm eventId={event._id} returnTo={returnTo} />
      <Link
        href="/"
        className="rounded-lg px-4 py-2 text-orange-300 underline focus-visible:outline-2"
      >
        Voltar ao início
      </Link>
    </main>
  );
}
