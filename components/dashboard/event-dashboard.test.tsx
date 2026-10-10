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
vi.mock("@/components/dashboard/user-list", () => ({ default: () => null }));

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

function renderDashboard(selectedEvent: HalloweenEvent, now: string) {
  return renderToStaticMarkup(
    <EventDashboard
      initialEvents={[selectedEvent]}
      initialCategories={[]}
      initialYear={selectedEvent.year}
      initialTab="settings"
      initialNow={now}
    />,
  );
}

describe("admin event dashboard enrollment states", () => {
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
