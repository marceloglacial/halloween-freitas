import { describe, expect, it } from "vitest";
import {
  getFeatureNavigationItems,
  isFeatureNavigationItemActive,
  type FeatureNavigationState,
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
  votingStatus: "not_started",
  resultsPublished: false,
};

const base: FeatureNavigationState = {
  event,
  phase: "event",
  rsvpAvailable: true,
  resultsAvailable: false,
  partyAlbumEvent: null,
  olderEditionsAvailable: false,
};

describe("lifecycle-aware feature navigation", () => {
  it("shows the ordered public sections and RSVP while registration is available", () => {
    expect(getFeatureNavigationItems(base).map(({ label }) => label)).toEqual([
      "Início",
      "Informações",
      "Programação",
      "Confirme sua presença",
    ]);
  });

  it("omits RSVP once the authoritative state says registration is unavailable", () => {
    expect(
      getFeatureNavigationItems({ ...base, rsvpAvailable: false }).map(
        ({ label }) => label,
      ),
    ).toEqual(["Início", "Informações", "Programação"]);
  });

  it("shows only currently accessible post-event destinations in the specified order", () => {
    const archive: FeatureNavigationState = {
      ...base,
      phase: "post-event",
      rsvpAvailable: false,
      resultsAvailable: true,
      partyAlbumEvent: {
        slug: "halloween-2025",
        title: "Halloween 2025",
        year: 2025,
      },
      olderEditionsAvailable: true,
    };
    expect(getFeatureNavigationItems(archive).map(({ label }) => label)).toEqual([
      "Início",
      "Vencedores",
      "Galeria de fotos",
      "Edições anteriores",
    ]);
    expect(getFeatureNavigationItems(archive).map(({ href }) => href)).toEqual([
      "/#inicio",
      "/resultados?event=halloween-2026",
      "/album-da-festa?event=halloween-2025",
      "/edicoes-anteriores?exclude=halloween-2026",
    ]);
  });

  it("omits unpublished results, empty albums, and inaccessible archive options", () => {
    const items = getFeatureNavigationItems({
      ...base,
      phase: "post-event",
      rsvpAvailable: false,
    });
    expect(items.map(({ label }) => label)).toEqual(["Início"]);
  });

  it("preserves the waiting state with only the home destination", () => {
    expect(
      getFeatureNavigationItems({
        ...base,
        event: null,
        phase: "waiting",
        rsvpAvailable: false,
      }).map(({ label }) => label),
    ).toEqual(["Início"]);
  });

  it("marks section and RSVP anchors active only at their own hashes", () => {
    const items = getFeatureNavigationItems(base);
    const schedule = items.find((item) => item.key === "schedule")!;
    const rsvp = items.find((item) => item.key === "rsvp")!;
    expect(isFeatureNavigationItemActive(schedule, "/", "#programacao")).toBe(
      true,
    );
    expect(isFeatureNavigationItemActive(schedule, "/", "#confirmacao")).toBe(
      false,
    );
    expect(isFeatureNavigationItemActive(rsvp, "/", "#confirmacao")).toBe(
      true,
    );
  });
});
