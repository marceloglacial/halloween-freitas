import { guestAccessUrl } from "@/util/guest-access";
import { getRegistrationState } from "@/util/registration-state";

export type FeatureNavigationItem =
  | {
      key: string;
      label: string;
      href: string;
      pathname: string;
    }
  | {
      key: string;
      label: string;
      status: string;
    };

export function getFeatureNavigationItems(
  event: HalloweenEvent | null,
  now = new Date(),
): FeatureNavigationItem[] {
  if (!event) return [];

  const eventContext = new URLSearchParams({ eventId: event._id }).toString();
  const resultsArePublic =
    event.votingStatus === "ended" && event.resultsPublished;
  const items: FeatureNavigationItem[] = [];
  const registrationState = getRegistrationState(event, now);

  if (registrationState === "open") {
    items.push({
      key: "rsvp",
      label: "Confirmar presença",
      href: "/#confirmacao",
      pathname: "/",
    });
  } else {
    items.push({
      key: "rsvp",
      label: "Presença",
      status:
        registrationState === "upcoming"
          ? "RSVP abre em breve"
          : "RSVP encerrado",
    });
  }

  items.push({
    key: "portal",
    label: "Meu Halloween",
    href: guestAccessUrl(event._id, `/meu-halloween?${eventContext}`),
    pathname: "/meu-halloween",
  });

  if (event.status === "active" && event.votingStatus === "open") {
    items.push({
      key: "voting",
      label: "Votar agora",
      href: guestAccessUrl(event._id, `/votacao/categories?${eventContext}`),
      pathname: "/votacao",
    });
  } else if (event.votingStatus === "ended" && !resultsArePublic) {
    items.push({
      key: "voting",
      label: "Votação encerrada",
      status: "Esta edição não aceita mais votos",
    });
  } else if (!resultsArePublic) {
    items.push({
      key: "voting",
      label: "Votação",
      status: "Votação em breve",
    });
  }

  if (resultsArePublic) {
    items.push({
      key: "results",
      label: "Resultados",
      href: `/resultados?event=${encodeURIComponent(event.slug)}`,
      pathname: "/resultados",
    });
  } else if (event.votingStatus === "ended") {
    items.push({
      key: "results",
      label: "Resultados",
      status: "Aguardando publicação",
    });
  }

  items.push({
    key: "gallery",
    label: "Fotos dos participantes",
    href: `/fotos?event=${encodeURIComponent(event.slug)}`,
    pathname: "/fotos",
  });

  items.push({
    key: "party-gallery",
    label: "Álbum da festa",
    href: `/album-da-festa?event=${encodeURIComponent(event.slug)}`,
    pathname: "/album-da-festa",
  });

  return items;
}
