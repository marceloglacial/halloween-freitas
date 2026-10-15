import { describe, expect, it } from "vitest";
import {
  getFeatureNavigationItems,
  isFeatureNavigationItemActive,
} from "@/util/feature-navigation";

const event: HalloweenEvent = {
  _id: "507f1f77bcf86cd799439011",
  year: 2026,
  slug: "halloween-2026",
  title: "Halloween dos Freitas",
  timezone: "America/Toronto",
  registrationStartsAt: "2026-09-01T00:00:00.000Z",
  eventStartsAt: "2026-10-31T20:00:00.000Z",
  status: "active",
  contestEntryStatus: "closed",
  votingStatus: "ended",
  resultsPublished: true,
};

describe("feature navigation galleries", () => {
  it("keeps the home link available when there is no active edition", () => {
    expect(getFeatureNavigationItems(null)).toEqual([
      {
        key: "home",
        icon: "home",
        label: "Início",
        href: "/",
        pathname: "/",
      },
    ]);
  });

  it("keeps contestant photos separate and links to the available album edition", () => {
    const albumEvent = {
      slug: "halloween-2025",
      title: "Halloween 2025",
      year: 2025,
    };
    const items = getFeatureNavigationItems(event, new Date(), albumEvent);

    expect(items.find((item) => item.key === "gallery")).toEqual({
      key: "gallery",
      icon: "gallery",
      label: "Fotos dos participantes",
      href: "/fotos?event=halloween-2026",
      pathname: "/fotos",
    });
    expect(items.find((item) => item.key === "party-gallery")).toEqual({
      key: "party-gallery",
      icon: "party-gallery",
      label: "Álbum da festa",
      href: "/album-da-festa?event=halloween-2025",
      pathname: "/album-da-festa",
    });
  });

  it("omits the party album when there is no published accessible album", () => {
    expect(
      getFeatureNavigationItems(event).some(
        (item) => item.key === "party-gallery",
      ),
    ).toBe(false);
  });

  it("keeps a published archive link even when there is no active edition", () => {
    const archive = {
      slug: "halloween-2025",
      title: "Halloween 2025",
      year: 2025,
    };

    expect(getFeatureNavigationItems(null, new Date(), archive)).toEqual([
      {
        key: "home",
        icon: "home",
        label: "Início",
        href: "/",
        pathname: "/",
      },
      {
        key: "party-gallery",
        icon: "party-gallery",
        label: "Álbum da festa",
        href: "/album-da-festa?event=halloween-2025",
        pathname: "/album-da-festa",
      },
    ]);
  });

  it("shows voting only for the active edition while its voting state is open", () => {
    const openItems = getFeatureNavigationItems(
      { ...event, votingStatus: "open", resultsPublished: false },
    );
    const closedItems = getFeatureNavigationItems({
      ...event,
      votingStatus: "ended",
      resultsPublished: false,
    });
    const upcomingItems = getFeatureNavigationItems({
      ...event,
      votingStatus: "not_started",
      resultsPublished: false,
    });
    const archivedItems = getFeatureNavigationItems({
      ...event,
      status: "archived",
      votingStatus: "open",
      resultsPublished: false,
    });

    const openVoting = openItems.find((item) => item.key === "voting");
    expect(openVoting).toMatchObject({ label: "Votação" });
    expect("href" in openVoting! ? openVoting.href : "").toContain(
      "returnTo=%2Fvotacao%2Fcategories",
    );
    for (const items of [closedItems, upcomingItems, archivedItems]) {
      expect(items.some((item) => item.key === "voting")).toBe(false);
    }
    expect(
      [...closedItems, ...upcomingItems].some((item) =>
        "status" in item ? item.status.includes("Votação") : false,
      ),
    ).toBe(false);
  });

  it("keeps voting hidden after the party starts until voting is opened", () => {
    const eventAfterPartyStarts = {
      ...event,
      eventStartsAt: "2026-10-01T20:00:00.000Z",
      votingStatus: "not_started" as const,
      resultsPublished: false,
    };

    expect(
      getFeatureNavigationItems(eventAfterPartyStarts).some(
        (item) => item.key === "voting",
      ),
    ).toBe(false);
  });

  it("marks nested routes and the active RSVP anchor", () => {
    const items = getFeatureNavigationItems(event);
    const portal = items.find((item) => item.key === "portal");
    const openRsvp = getFeatureNavigationItems(
      { ...event, votingStatus: "not_started", resultsPublished: false },
      new Date("2026-10-15T12:00:00.000Z"),
    ).find((item) => item.key === "rsvp");

    expect(portal).toBeDefined();
    expect(
      isFeatureNavigationItemActive(portal!, "/meu-halloween/entradas"),
    ).toBe(true);
    expect(openRsvp).toBeDefined();
    expect(isFeatureNavigationItemActive(openRsvp!, "/", "#confirmacao")).toBe(
      true,
    );
    expect(isFeatureNavigationItemActive(openRsvp!, "/")).toBe(false);
  });
});
