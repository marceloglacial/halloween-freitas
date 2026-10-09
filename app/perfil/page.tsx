import FeatureUnavailable from "@/components/feature-unavailable";
import GuestProfileForm from "@/components/auth/guest-profile-form";
import { getEventById } from "@/lib/events";
import { validGuestEventId } from "@/util/guest-access";

export const dynamic = "force-dynamic";

export default async function GuestProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ eventId?: string }>;
}) {
  const { eventId } = await searchParams;
  if (!validGuestEventId(eventId))
    return (
      <FeatureUnavailable
        title="Escolha um evento"
        message="Entre pelo acesso de convidados da edição para consultar seu perfil."
      />
    );

  const event = await getEventById(eventId);
  if (!event)
    return (
      <FeatureUnavailable
        title="Evento não encontrado"
        message="Confira o link da edição e tente novamente."
      />
    );

  return (
    <GuestProfileForm
      eventId={event._id}
      eventTitle={event.title}
      eventYear={event.year}
    />
  );
}
