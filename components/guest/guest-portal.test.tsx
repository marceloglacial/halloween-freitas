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

describe("guest portal", () => {
  it("offers individual, group, party-photo, and open voting flows", () => {
    const html = renderToStaticMarkup(
      <GuestPortal
        event={event}
        guestName="Ana Freitas"
        entries={[]}
        now="2026-10-09T12:00:00.000Z"
      />,
    );

    expect(html).toContain("Fantasia individual");
    expect(html).toContain("Fantasia em grupo");
    expect(html).toContain("Fotos da festa");
    expect(html).toContain("Votação aberta");
    expect(html).not.toContain("infantil");
    expect(html).not.toContain("criança");
    expect(html).not.toContain("/meu-halloween/criancas");
  });

  it("shows owned entry status without exposing ownership fields", () => {
    const html = renderToStaticMarkup(
      <GuestPortal
        event={event}
        guestName="Ana Freitas"
        entries={[
          {
            _id: "individual-entry",
            categoryId: "category-id",
            entryType: "individual",
            displayName: "Ana Freitas",
            status: "locked",
          },
        ]}
        now="2026-10-09T12:00:00.000Z"
      />,
    );

    expect(html).toContain("Inscrição congelada para votação");
    expect(html).not.toContain("ownerRsvpId");
    expect(html).not.toContain("guardianRsvpId");
    expect(html).not.toContain("@example.com");
  });

  it("does not advertise voting before it opens", () => {
    const html = renderToStaticMarkup(
      <GuestPortal
        event={{ ...event, votingStatus: "not_started" }}
        guestName="Ana Freitas"
        entries={[]}
        now="2026-10-09T12:00:00.000Z"
      />,
    );

    expect(html).not.toContain("/meu-halloween/votacao");
    expect(html).not.toContain("Votação aberta");
  });
});
