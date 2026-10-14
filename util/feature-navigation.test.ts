import { describe, expect, it } from "vitest";
import { getFeatureNavigationItems } from "@/util/feature-navigation";

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
  it("has no event-dependent links when there is no active edition", () => {
    expect(getFeatureNavigationItems(null)).toEqual([]);
  });

  it("keeps contestant photos separate and links to the selected party album", () => {
    const items = getFeatureNavigationItems(event);

    expect(items.find((item) => item.key === "gallery")).toEqual({
      key: "gallery",
      label: "Fotos dos participantes",
      href: "/fotos?event=halloween-2026",
      pathname: "/fotos",
    });
    expect(items.find((item) => item.key === "party-gallery")).toEqual({
      key: "party-gallery",
      label: "Álbum da festa",
      href: "/album-da-festa?event=halloween-2026",
      pathname: "/album-da-festa",
    });
  });
});
