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
});
