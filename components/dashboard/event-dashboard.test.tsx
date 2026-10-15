import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("@/components/logout-button", () => ({ default: () => null }));
vi.mock("@/components/dashboard/admin-results", () => ({
  default: () => null,
}));
vi.mock("@/components/dashboard/admin-party-album", () => ({
  default: () => <div>Gerenciamento do álbum</div>,
}));

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

function renderDashboard(
  selectedEvent: HalloweenEvent,
  now: string,
  tab: "settings" | "results" | "photos" = "settings",
  initialCategories: Category[] = [],
) {
  return renderToStaticMarkup(
    <EventDashboard
      initialEvents={[selectedEvent]}
      initialCategories={initialCategories}
      initialYear={selectedEvent.year}
      initialTab={tab}
      initialNow={now}
    />,
  );
}

describe("admin event dashboard enrollment states", () => {
  it("previews all seven default categories when creating an event", () => {
    const markup = renderToStaticMarkup(
      <EventDashboard
        initialEvents={[]}
        initialCategories={[]}
        initialTab="settings"
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

  it("groups edition details, schedule, advanced controls and dangerous actions", () => {
    const markup = renderDashboard(event, "2026-09-15T00:00:00.000Z");

    expect(markup).toContain("Detalhes da edição");
    expect(markup).toContain("Agenda");
    expect(markup).toContain("Opções avançadas");
    expect(markup).toContain("Zona de perigo");
    expect(markup).toContain("Criar próxima edição");
    expect(markup).not.toContain('id="event-year"');
    expect(markup).not.toContain("Navegação administrativa");
  });

  it("shows the selected event's stored categories in its settings", () => {
    const storedCategory: Category = {
      _id: "category-1",
      eventId: event._id,
      title: "Categoria revisada",
      icon: "🦇",
      order: 0,
      eligibility: "all",
    };
    const markup = renderDashboard(
      event,
      "2026-09-15T00:00:00.000Z",
      "settings",
      [storedCategory],
    );

    expect(markup).toContain("Categoria revisada");
    expect(markup).toContain("🦇");
  });

  it("shows RSVP open while contestant entry is closed", () => {
    const markup = renderDashboard(event, "2026-09-15T00:00:00.000Z");

    expect(markup).toContain("RSVP aberto");
    expect(markup).toContain("As inscrições do concurso estão fechadas.");
    expect(markup).toContain(
      "Fechar as inscrições do concurso mantém as confirmações de presença abertas.",
    );
  });

  it("shows RSVP as scheduled before its start time", () => {
    const markup = renderDashboard(event, "2026-08-31T00:00:00.000Z");

    expect(markup).toContain("RSVP agendado");
    expect(markup).toContain("America/Toronto");
  });

  it("explains the permanent RSVP and participant cutoff after voting opens", () => {
    const markup = renderDashboard(
      { ...event, votingStatus: "open" },
      "2026-11-01T01:00:00.000Z",
    );

    expect(markup).toContain("RSVP encerrado");
    expect(markup).toContain("permanentemente");
    expect(markup).toContain("As inscrições não podem ser alteradas");
  });
});

describe("admin party album dashboard navigation", () => {
  it("opens the album management section for the selected edition", () => {
    const markup = renderDashboard(event, "2026-10-31T20:00:00.000Z", "photos");

    expect(markup).toContain("Gerenciamento do álbum");
  });
});
