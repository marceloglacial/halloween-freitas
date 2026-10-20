import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/components/logout-button", () => ({
  default: () => <button type="button">Sair</button>,
}));

import GuestPortal from "@/components/guest/guest-portal";

const event: HalloweenEvent = {
  _id: "507f1f77bcf86cd799439011",
  year: 2026,
  slug: "halloween-2026",
  title: "Halloween dos Freitas",
  timezone: "America/Toronto",
  registrationStartsAt: "2026-09-01T00:00:00.000Z",
  eventStartsAt: "2026-10-01T00:00:00.000Z",
  status: "active",
  contestEntryStatus: "closed",
  votingStatus: "open",
  resultsPublished: false,
};

const categories: Category[] = [
  {
    _id: "507f1f77bcf86cd799439012",
    eventId: event._id,
    title: "Fantasia mais criativa",
    icon: "🧙",
    order: 0,
    eligibility: "all",
  },
  {
    _id: "507f1f77bcf86cd799439015",
    eventId: event._id,
    title: "Fantasia infantil",
    icon: "🧒",
    order: 1,
    eligibility: "junior",
  },
  {
    _id: "507f1f77bcf86cd799439016",
    eventId: event._id,
    title: "Fantasia em grupo",
    icon: "👻",
    order: 2,
    eligibility: "group",
  },
];

describe("guest portal", () => {
  it("offers event category voting to an attendee without contestant entries", () => {
    const html = renderToStaticMarkup(
      <GuestPortal
        event={event}
        guestName="Ana Freitas"
        entries={[]}
        categories={categories}
        votedCategoryIds={[]}
        now="2026-10-09T12:00:00.000Z"
      />,
    );

    expect(html).toContain("Você ainda não tem inscrições neste evento");
    expect(html).toContain("Ir para votação");
    expect(html).toContain("Votar →");
    expect(html).toContain(
      `/votacao/categories/${categories[0]._id}?eventId=${event._id}`,
    );
    expect(html).toContain(
      "As inscrições do concurso estão encerradas nesta edição.",
    );
    expect(html).not.toContain("Criar inscrição individual");
  });

  it("lets a guest create one individual draft in an eligible category", () => {
    const html = renderToStaticMarkup(
      <GuestPortal
        event={{
          ...event,
          contestEntryStatus: "open",
          votingStatus: "not_started",
        }}
        guestName="Ana Freitas"
        entries={[]}
        categories={categories}
        votedCategoryIds={[]}
        now="2026-09-15T00:00:00.000Z"
      />,
    );

    expect(html).toContain("Fantasia individual");
    expect(html).toContain("Categoria");
    expect(html).toContain("Fantasia mais criativa");
    expect(html).toContain("Título da fantasia (opcional)");
    expect(html).toContain("Criar inscrição individual");
    expect(html).toContain("Depois, envie uma foto com autorização.");
  });

  it("lets a guest update the individual costume title while entries are open", () => {
    const html = renderToStaticMarkup(
      <GuestPortal
        event={{
          ...event,
          contestEntryStatus: "open",
          votingStatus: "not_started",
        }}
        guestName="Ana Freitas"
        entries={[
          {
            _id: "individual-entry",
            categoryId: categories[0]._id,
            entryType: "individual",
            displayName: "Ana Freitas",
            costumeTitle: "Bruxa das abóboras",
            status: "draft",
          },
        ]}
        categories={categories}
        votedCategoryIds={[]}
        now="2026-09-15T00:00:00.000Z"
      />,
    );

    expect(html).toContain("Título: Bruxa das abóboras");
    expect(html).toContain('value="Bruxa das abóboras"');
    expect(html).toContain("Salvar título");
  });

  it("offers guardian-managed junior registration in junior categories", () => {
    const html = renderToStaticMarkup(
      <GuestPortal
        event={{
          ...event,
          contestEntryStatus: "open",
          votingStatus: "not_started",
        }}
        guestName="Ana Freitas"
        entries={[]}
        categories={categories}
        votedCategoryIds={[]}
        now="2026-09-15T00:00:00.000Z"
      />,
    );

    expect(html).toContain("Adicionar criança ao concurso");
    expect(html).toContain("Nome da criança");
    expect(html).toContain("Fantasia (opcional)");
    expect(html).toContain("Inscreva cada criança separadamente");
    expect(html).toContain("Fantasia infantil");
    expect(html).toContain("rascunho fica privado");
  });

  it("lets a guest create one group entry without registering a roster", () => {
    const html = renderToStaticMarkup(
      <GuestPortal
        event={{
          ...event,
          contestEntryStatus: "open",
          votingStatus: "not_started",
        }}
        guestName="Ana Freitas"
        entries={[]}
        categories={categories}
        votedCategoryIds={[]}
        now="2026-09-15T00:00:00.000Z"
      />,
    );

    expect(html).toContain("Criar inscrição de grupo");
    expect(html).toContain("Nome do grupo");
    expect(html).toContain("Fantasia em grupo");
    expect(html).toContain("Título da fantasia (opcional)");
    expect(html).toContain("Não é necessário cadastrar integrantes");
    expect(html).toContain("você poderá votar na sua própria inscrição");
    expect(html).not.toContain("Nome dos integrantes");
  });

  it("does not offer a second group when the guest already owns one", () => {
    const html = renderToStaticMarkup(
      <GuestPortal
        event={{
          ...event,
          contestEntryStatus: "open",
          votingStatus: "not_started",
        }}
        guestName="Ana Freitas"
        entries={[
          {
            _id: "group-entry",
            categoryId: categories[2]._id,
            entryType: "group",
            displayName: "Família Freitas",
            status: "draft",
          },
        ]}
        categories={categories}
        votedCategoryIds={[]}
        now="2026-09-15T00:00:00.000Z"
      />,
    );

    expect(html).toContain("Você já tem uma inscrição de grupo nesta edição.");
    expect(html).not.toContain("Criar inscrição de grupo");
  });

  it("shows each owned entry status without exposing ownership or email", () => {
    const html = renderToStaticMarkup(
      <GuestPortal
        event={event}
        guestName="Ana Freitas"
        entries={[
          {
            _id: "candidate-id",
            categoryId: categories[0]._id,
            entryType: "junior",
            displayName: "Bia Freitas",
            status: "locked",
          },
        ]}
        categories={categories}
        votedCategoryIds={[categories[0]._id]}
        now="2026-10-09T12:00:00.000Z"
      />,
    );

    expect(html).toContain("Fantasia infantil");
    expect(html).toContain("Inscrição congelada para votação");
    expect(html).toContain("Voto registrado");
    expect(html).not.toContain("ownerRsvpId");
    expect(html).not.toContain("guardianRsvpId");
    expect(html).not.toContain("@example.com");
  });

  it("keeps category actions disabled until the event voting state opens", () => {
    const html = renderToStaticMarkup(
      <GuestPortal
        event={{ ...event, votingStatus: "not_started" }}
        guestName="Ana Freitas"
        entries={[]}
        categories={categories}
        votedCategoryIds={[]}
        now="2026-10-09T12:00:00.000Z"
      />,
    );

    expect(html).toContain("A votação ainda não foi aberta pela organização");
    expect(html).not.toContain("Ir para votação");
    expect(html).not.toContain(`/votacao/categories/${categories[0]._id}?`);
    expect(html).toContain('aria-disabled="true"');
  });

  it("shows an accessible photo upload and explicit consent while entry is open", () => {
    const html = renderToStaticMarkup(
      <GuestPortal
        event={{
          ...event,
          contestEntryStatus: "open",
          votingStatus: "not_started",
        }}
        guestName="Ana Freitas"
        entries={[
          {
            _id: "candidate-id",
            categoryId: categories[0]._id,
            entryType: "junior",
            displayName: "Bia Freitas",
            status: "draft",
          },
        ]}
        categories={categories}
        votedCategoryIds={[]}
        now="2026-10-09T12:00:00.000Z"
      />,
    );

    expect(html).toContain('accept="image/jpeg,image/png,image/webp"');
    expect(html).toContain(
      "Confirmo que sou responsável legal e autorizo o uso desta foto",
    );
    expect(html).toContain("Nenhuma foto foi enviada");
    expect(html).toContain("JPG, PNG ou WebP, até 8 MB.");
  });
});
