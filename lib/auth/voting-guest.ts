import {
  getGuestRegistration,
  GuestAccessError,
} from "@/lib/auth/guest-registration";
import { getCurrentEvent, isVotingOpen } from "@/lib/events";
import { validGuestEventId } from "@/util/guest-access";

export async function getVotingGuest(eventId?: unknown) {
  if (eventId !== undefined && !validGuestEventId(eventId))
    throw new GuestAccessError(400, "invalid_event", "Evento inválido");
  const event = await getCurrentEvent();
  if (
    !event ||
    !isVotingOpen(event) ||
    (eventId !== undefined && eventId !== event._id)
  )
    throw new GuestAccessError(
      403,
      "voting_closed",
      "A votação não está aberta para este evento",
    );
  const guest = await getGuestRegistration(event._id);
  if (guest.eventId !== event._id)
    throw new GuestAccessError(
      403,
      "wrong_event",
      "A confirmação pertence a outro evento",
    );
  return guest;
}
