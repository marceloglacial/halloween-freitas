export type FeatureNavigationItem = {
  key: string;
  icon: FeatureNavigationIcon;
  label: string;
  href: string;
  pathname: string;
};

export type FeatureNavigationIcon =
  | "home"
  | "dashboard"
  | "info"
  | "schedule"
  | "rsvp"
  | "results"
  | "party-gallery"
  | "archives"
  | "login";

export type PartyAlbumNavigationEvent = Pick<
  HalloweenEvent,
  "slug" | "title" | "year"
>;

export type FeatureNavigationState = {
  event: HalloweenEvent | null;
  phase: "waiting" | "event" | "post-event";
  rsvpAvailable: boolean;
  resultsAvailable: boolean;
  partyAlbumEvent: PartyAlbumNavigationEvent | null;
  olderEditionsAvailable: boolean;
};

export function isFeatureNavigationItemActive(
  item: FeatureNavigationItem,
  pathname: string,
  hash = "",
) {
  if (item.key === "home") return pathname === "/" && hash !== "#confirmacao";
  if (item.key === "rsvp") {
    return pathname === "/" && hash === "#confirmacao";
  }
  if (item.href.startsWith("/#")) {
    return pathname === "/" && hash === item.href.slice(1);
  }
  return (
    pathname === item.pathname ||
    (item.pathname !== "/" && pathname.startsWith(`${item.pathname}/`))
  );
}

export function getFeatureNavigationItems(
  state: FeatureNavigationState,
): FeatureNavigationItem[] {
  const home: FeatureNavigationItem = {
    key: "home",
    icon: "home",
    label: "Início",
    href: "/#inicio",
    pathname: "/",
  };

  if (state.phase === "event") {
    const items: FeatureNavigationItem[] = [
      home,
      {
        key: "info",
        icon: "info",
        label: "Informações",
        href: "/#informacoes",
        pathname: "/",
      },
      {
        key: "schedule",
        icon: "schedule",
        label: "Programação",
        href: "/#programacao",
        pathname: "/",
      },
    ];
    if (state.rsvpAvailable) {
      items.push({
        key: "rsvp",
        icon: "rsvp",
        label: "Confirme sua presença",
        href: "/#confirmacao",
        pathname: "/",
      });
    }
    return items;
  }

  if (state.phase !== "post-event" || !state.event) return [home];

  const items = [home];
  if (state.resultsAvailable) {
    items.push({
      key: "results",
      icon: "results",
      label: "Vencedores",
      href: `/resultados?event=${encodeURIComponent(state.event.slug)}`,
      pathname: "/resultados",
    });
  }
  if (state.partyAlbumEvent) {
    items.push({
      key: "party-gallery",
      icon: "party-gallery",
      label: "Galeria de fotos",
      href: `/album-da-festa?event=${encodeURIComponent(state.partyAlbumEvent.slug)}`,
      pathname: "/album-da-festa",
    });
  }
  if (state.olderEditionsAvailable) {
    items.push({
      key: "archives",
      icon: "archives",
      label: "Edições anteriores",
      href: `/edicoes-anteriores?exclude=${encodeURIComponent(state.event.slug)}`,
      pathname: "/edicoes-anteriores",
    });
  }
  return items;
}
