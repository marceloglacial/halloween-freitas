import {
  getGuestRegistration,
  GuestAccessError,
} from "@/lib/auth/guest-registration";
import { getCurrentEvent, getEventById } from "@/lib/events";
import { guestAccessUrl, validGuestEventId } from "@/util/guest-access";
import { redirect } from "next/navigation";

export async function getGuestPageContext(
  eventId: string | undefined,
  returnToPath: string,
) {
  if (eventId !== undefined && !validGuestEventId(eventId)) {
    return {
      ok: false as const,
      title: "Evento inválido",
      message: "Confira o link da edição e tente novamente.",
    };
  }

  const event = eventId ? await getEventById(eventId) : await getCurrentEvent();
  if (!event) {
    return {
      ok: false as const,
      title: "Evento não encontrado",
      message: "Não encontramos uma edição para mostrar.",
    };
  }

  try {
    const guest = await getGuestRegistration(event._id);
    return { ok: true as const, event, guest };
  } catch (error) {
    if (!(error instanceof GuestAccessError)) throw error;
    if (["signed_out", "unlinked", "unverified"].includes(error.code)) {
      const returnTo = `${returnToPath}?eventId=${event._id}`;
      redirect(guestAccessUrl(event._id, returnTo));
    }
    return {
      ok: false as const,
      title: "Acesso indisponível",
      message: error.message,
    };
  }
}
