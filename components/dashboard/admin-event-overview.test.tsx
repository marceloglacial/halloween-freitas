import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import AdminEventOverview from "@/components/dashboard/admin-event-overview";

const event: HalloweenEvent = {
  _id: "507f1f77bcf86cd799439011",
  year: 2025,
  slug: "halloween-2025",
  title: "Halloween dos Freitas 2025",
  timezone: "America/Toronto",
  registrationStartsAt: "2025-09-01T04:00:00.000Z",
  eventStartsAt: "2025-10-31T23:00:00.000Z",
  contestEntryStatus: "open",
  votingStatus: "not_started",
  resultsPublished: false,
  status: "active",
};
const overview = {
  confirmedRsvps: 12,
  eligibleContestants: 8,
  votes: 0,
  categories: 6,
  partyPhotos: 3,
  albumPublished: false,
};

describe("admin event overview", () => {
  it("shows event-scoped KPIs, archive status, timezone and actionable modules", () => {
    const html = renderToStaticMarkup(
      <AdminEventOverview
        event={event}
        overview={overview}
        now={new Date("2025-08-01T12:00:00.000Z")}
      />,
    );
    expect(html).toContain("edição 2025 · ativa");
    expect(html).toContain("12");
    expect(html).toContain("8");
    expect(html).toContain("America/Toronto");
    expect(html).toContain("Categorias do concurso");
    expect(html).toContain("Álbum da festa");
    expect(html).toContain("/dashboard/concursos?year=2025");
    expect(html).toContain("/dashboard/galeria?year=2025");
    expect(html).toContain("Abertura das confirmações");
  });

  it("offers publication as the next action after voting ends", () => {
    const html = renderToStaticMarkup(
      <AdminEventOverview
        event={{ ...event, votingStatus: "ended" }}
        overview={{ ...overview, eligibleContestants: 0 }}
        now={new Date("2025-11-01T12:00:00.000Z")}
      />,
    );
    expect(html).toContain("Aguardando publicação");
    expect(html).toContain("Publicar resultados");
    expect(html).toContain(
      'Próximo marco</p><p class="mt-1 text-lg font-semibold">Publicar os resultados',
    );
  });
});
