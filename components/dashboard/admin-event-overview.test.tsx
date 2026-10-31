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
  votingGuests: 6,
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
    expect(html).not.toContain("Edição 2025");
    expect(html).toContain(">Visão Geral</h1>");
    expect(html).not.toContain("Halloween dos Freitas 2025");
    expect(html).toContain("12");
    expect(html).toContain("8");
    expect(html).toContain("de 12 (67%)");
    expect(html).toContain("de 12 (50%)");
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
    expect(html).toContain("Liberar resultados para todos");
    expect(html).toContain(
      'Próximo marco</p><p class="mt-1 text-lg font-semibold">Liberar os resultados para todos',
    );
  });

  it.each([
    {
      name: "pre-registration",
      changes: {},
      now: "2025-08-01T12:00:00.000Z",
      status: "Confirmações ainda não abertas",
      action: "Configurar edição",
      href: "/dashboard/configuracoes?year=2025",
    },
    {
      name: "registration open",
      changes: {},
      now: "2025-09-01T04:00:00.000Z",
      status: "Confirmações abertas",
      action: "Acompanhar confirmações",
      href: "/dashboard/convidados?year=2025",
    },
    {
      name: "party started, voting not started",
      changes: { contestEntryStatus: "closed" as const },
      now: "2025-11-01T12:00:00.000Z",
      status: "Festa iniciada · votação não iniciada",
      action: "Iniciar votação",
      href: "/dashboard/votacao?year=2025",
    },
    {
      name: "party started, contest entries still open",
      changes: { contestEntryStatus: "open" as const },
      now: "2025-11-01T12:00:00.000Z",
      status: "Festa iniciada · votação não iniciada",
      action: "Fechar inscrições do concurso",
      href: "/dashboard/concursos?year=2025",
    },
    {
      name: "voting open",
      changes: { votingStatus: "open" as const },
      now: "2025-11-01T12:00:00.000Z",
      status: "Votação aberta",
      action: "Acompanhar votação",
      href: "/dashboard/votacao?year=2025",
    },
    {
      name: "voting ended",
      changes: { votingStatus: "ended" as const },
      now: "2025-11-01T12:00:00.000Z",
      status: "Votação encerrada · resultados privados para o admin",
      action: "Liberar resultados para todos",
      href: "/dashboard/votacao?year=2025",
    },
    {
      name: "published results",
      changes: { votingStatus: "ended" as const, resultsPublished: true },
      now: "2025-11-01T12:00:00.000Z",
      status: "Resultados publicados",
      action: "Gerenciar álbum da festa",
      href: "/dashboard/galeria?year=2025",
    },
  ])("shows lifecycle state and a contextual action for $name", (scenario) => {
    const html = renderToStaticMarkup(
      <AdminEventOverview
        event={{ ...event, ...scenario.changes }}
        overview={overview}
        now={new Date(scenario.now)}
      />,
    );

    expect(html).toContain(`Estado atual: ${scenario.status}`);
    expect(html).toContain(scenario.action);
    expect(html).toContain(`href="${scenario.href}"`);
  });

  it("does not suggest first voting for an archived edition", () => {
    const html = renderToStaticMarkup(
      <AdminEventOverview
        event={{ ...event, status: "archived", contestEntryStatus: "closed" }}
        overview={overview}
        now={new Date("2025-11-01T12:00:00.000Z")}
      />,
    );

    expect(html).toContain("Estado atual: Edição arquivada");
    expect(html).toContain("Consultar edição");
    expect(html).toContain("Edição arquivada; a votação não pode ser iniciada");
    expect(html).not.toContain("Iniciar votação");
    expect(html).not.toContain("Fechar inscrições do concurso");
  });
});
