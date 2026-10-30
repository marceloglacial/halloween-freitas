import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.ComponentProps<"a">) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("@/components/dashboard/admin-results", () => ({
  default: () => <div>Apuração por categoria</div>,
}));

import AdminVoting from "@/components/dashboard/admin-voting";

const event: HalloweenEvent = {
  _id: "event-2026",
  year: 2026,
  slug: "halloween-2026",
  title: "Halloween 2026",
  timezone: "America/Toronto",
  registrationStartsAt: "2026-09-01T04:00:00.000Z",
  eventStartsAt: "2026-10-31T23:00:00.000Z",
  contestEntryStatus: "closed",
  votingStatus: "ended",
  resultsPublished: false,
  status: "active",
};

describe("admin voting page", () => {
  it("separates round state and result publication with reopening guidance", () => {
    const html = renderToStaticMarkup(
      <AdminVoting event={event} openRoundType={null} now="2026-11-01T01:00:00.000Z" />,
    );

    expect(html).toContain(">Votação</h1>");
    expect(html).toContain('aria-label="Estado da votação: Encerrada"');
    expect(html).toContain("Reabrir votação");
    expect(html).toContain("Liberação pública dos resultados");
    expect(html).toContain("Ainda privados; visíveis apenas para o admin");
    expect(html).toContain("transmissão ao vivo");
    expect(html).toContain("Liberar resultados para todos");
    expect(html).toContain('href="/resultados?event=halloween-2026"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain(">Ver resultados</a>");
    expect(html).toContain("Reabrir mantém os votos anteriores");
    expect(html).toContain("Apuração por categoria");
    expect(html).not.toContain(event.title);
  });

  it("requires an active edition, event start and closed entry before opening", () => {
    const html = renderToStaticMarkup(
      <AdminVoting
        event={{
          ...event,
          votingStatus: "not_started",
          contestEntryStatus: "open",
        }}
        openRoundType={null}
        now="2026-11-01T01:00:00.000Z"
      />,
    );

    expect(html).toContain("Feche as inscrições do concurso antes de iniciar");
    expect(html).toContain('disabled=""');
    expect(html).toContain("Não iniciada");
  });
});
