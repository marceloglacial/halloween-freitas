import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import EventDashboard from "@/components/dashboard/event-dashboard";

const event: HalloweenEvent = {
  _id: "507f1f77bcf86cd799439011",
  year: 2026,
  slug: "halloween-2026",
  title: "Halloween 2026",
  timezone: "America/Toronto",
  registrationStartsAt: "2026-09-01T04:00:00.000Z",
  eventStartsAt: "2026-11-01T00:00:00.000Z",
  contestEntryStatus: "closed",
  votingStatus: "not_started",
  resultsPublished: false,
  status: "active",
};

function renderDashboard(selectedEvent: HalloweenEvent) {
  return renderToStaticMarkup(
    <EventDashboard
      initialEvents={[selectedEvent]}
      initialYear={selectedEvent.year}
      initialNow="2026-09-15T00:00:00.000Z"
    />,
  );
}

describe("event settings route", () => {
  it("previews default categories when creating an annual edition", () => {
    const markup = renderToStaticMarkup(
      <EventDashboard
        initialEvents={[]}
        initialNow="2026-10-15T12:00:00.000Z"
      />,
    );

    expect(markup).toContain("Categorias padrão");
    expect(markup).toContain("Criar primeira edição");
    expect(markup).toContain("🏆 Melhor Fantasia");
    expect(markup).toContain("💩 Pior Fantasia");
    expect(markup).toContain("🧟 Fantasia Mais Assustadora");
    expect(markup).toContain("🤡 Fantasia Mais Engraçada");
    expect(markup).toContain("👯‍♀️ Melhor Fantasia de Grupo ou Dupla");
    expect(markup).toContain("🧒 Melhor Fantasia Infantil");
    expect(markup).toContain("🔥 Fantasia Mais Sexy");
    expect(markup).not.toContain("Adicionar categoria");
  });

  it("keeps event details, schedule, and archive controls on settings", () => {
    const markup = renderDashboard(event);

    expect(markup).toContain("Detalhes da edição");
    expect(markup).toContain("Agenda");
    expect(markup).toContain("Zona de perigo");
    expect(markup).toContain("Criar próxima edição");
    expect(markup).not.toContain("Opções avançadas");
    expect(markup).not.toContain("Categorias");
    expect(markup).not.toContain("Iniciar votação");
  });

  it("preserves archive activation actions on the settings page", () => {
    expect(renderDashboard({ ...event, status: "archived" })).toContain(
      "Ativar edição",
    );
  });
});
