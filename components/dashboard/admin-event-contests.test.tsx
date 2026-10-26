import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("@/components/dashboard/user-list", () => ({
  default: ({ event }: { event: HalloweenEvent }) => (
    <div>Inscrições de {event.year}</div>
  ),
}));

import AdminEventContests, {
  closeEnrollmentPrompt,
} from "@/components/dashboard/admin-event-contests";

const event: HalloweenEvent = {
  _id: "event-2025",
  year: 2025,
  slug: "halloween-2025",
  title: "Halloween 2025",
  timezone: "America/Toronto",
  registrationStartsAt: "2025-09-01T04:00:00.000Z",
  eventStartsAt: "2025-10-31T23:00:00.000Z",
  contestEntryStatus: "closed",
  votingStatus: "ended",
  resultsPublished: false,
  status: "archived",
};

describe("admin contest page", () => {
  it("keeps archived edition categories and participant controls in their own section", () => {
    const html = renderToStaticMarkup(
      createElement(AdminEventContests, {
        event,
        participantCount: 0,
        confirmedRsvps: 0,
        now: "2025-11-01T01:00:00.000Z",
      }),
    );

    expect(html).toContain(">Concursos</h1>");
    expect(html).not.toContain("Edição 2025");
    expect(html).not.toContain(event.title);
    expect(html).toContain("Edição arquivada");
    expect(html).toContain("Categorias do concurso");
    expect(html).toContain(">Inscrições</h2>");
    expect(html).toContain("role=\"status\"");
    expect(html.indexOf("0 participantes")).toBeLessThan(
      html.indexOf("Categorias do concurso"),
    );
    expect(html).toContain(
      "As inscrições não podem ser alteradas após a primeira abertura da votação.",
    );
  });

  it("warns that only guests with photos will compete when RSVPs exist", () => {
    expect(closeEnrollmentPrompt(1)).toContain(
      "Há 1 convidado com presença confirmada",
    );
    expect(closeEnrollmentPrompt(3)).toContain(
      "Há 3 convidados com presença confirmada",
    );
    expect(closeEnrollmentPrompt(3)).toContain(
      "Somente convidados que já enviaram uma foto válida concorrerão",
    );
    expect(closeEnrollmentPrompt(0)).toContain("Novos RSVPs");
  });
});
