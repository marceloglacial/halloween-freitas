import { renderToStaticMarkup } from "react-dom/server";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

const toastMock = vi.hoisted(() => ({ warning: vi.fn() }));

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
vi.mock("next/navigation", () => ({ usePathname: () => "/meu-halloween" }));
vi.mock("@clerk/nextjs", () => ({
  useUser: () => ({ isLoaded: true, user: null }),
}));
vi.mock("sonner", () => ({ toast: toastMock }));
vi.mock("@/components/logout-button", () => ({
  default: () => <button type="button">Sair</button>,
}));

import GuestPortal from "@/components/guest/guest-portal";
import GuestBottomNavigation from "@/components/guest/guest-bottom-navigation";
import GuestFlowCard from "@/components/guest/guest-flow-card";

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

    expect(html).toContain("Halloween dos Freitas 2026");
    expect(html).toContain('aria-label="Abrir menu da conta de Ana Freitas"');
    expect(html).toContain('id="guest-account-menu" hidden=""');
    expect(html).toContain("Sair");
    expect(html).toContain('href="/"');
    expect(html).toContain("Voltar para o site");
    expect(html).toContain("Fantasia individual");
    expect(html).toContain("Fantasia em grupo");
    expect(html).toContain("Fotos da festa");
    expect(html).toContain("Votação aberta");
    expect(html).toContain('aria-disabled="true"');
    expect(html).toContain("Inscrições congeladas");
    expect(html).toContain(
      "rounded-full px-3 py-1 text-xs leading-4 font-semibold",
    );
    expect(html).toContain("bg-green-400/15 text-green-200");
    expect(html).toContain("bg-gray-700 text-gray-200");
    expect(html).toContain('aria-label="Navegação principal do portal"');
    expect(html).toContain('aria-label="Fantasia individual"');
    expect(html).toContain('aria-label="Fantasia em grupo"');
    expect(html).toContain('aria-label="Fotos da festa"');
    expect(html).toContain('aria-label="Votação"');
    expect(html).toContain('aria-current="page" aria-label="Início"');
    expect(html).not.toContain(
      'href="/meu-halloween/individual?eventId=507f1f77bcf86cd799439011"',
    );
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

    expect(html).toContain("Inscrições congeladas");
    expect(html).toContain("bg-gray-700 text-gray-200");
    expect(html).not.toContain("ownerRsvpId");
    expect(html).not.toContain("guardianRsvpId");
    expect(html).not.toContain("@example.com");
  });

  it("marks entries in progress with an orange status badge", () => {
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
            categoryId: "category-id",
            entryType: "individual",
            displayName: "Ana Freitas",
            status: "draft",
          },
        ]}
        now="2026-10-09T12:00:00.000Z"
      />,
    );

    expect(html).toContain("Inscrição em andamento");
    expect(html).toContain("bg-orange-400/15 text-orange-200");
  });

  it("confirms completed entries and describes their voting readiness", () => {
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
            categoryId: "category-id",
            entryType: "individual",
            displayName: "Ana Freitas",
            status: "ready",
          },
        ]}
        now="2026-10-09T12:00:00.000Z"
      />,
    );

    expect(html).toContain("Inscrição confirmada");
    expect(html).toContain(
      "Sua inscrição está confirmada e a fantasia está pronta para participar da votação. Você ainda pode editá-la enquanto as inscrições estiverem abertas.",
    );
    expect(html).not.toContain("Inscrição concluída");
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

    expect(html).not.toContain('href="/meu-halloween/votacao?eventId=');
    expect(html).not.toContain("Votação aberta");
    expect(html).toContain('aria-label="Votação"');
    expect(html).toContain('aria-disabled="true"');
  });

  it("keeps upcoming costume cards navigable and reports the closed-card notice on activation", () => {
    const html = renderToStaticMarkup(
      <GuestPortal
        event={{
          ...event,
          contestEntryStatus: "open",
          votingStatus: "not_started",
        }}
        guestName="Ana Freitas"
        entries={[]}
        now="2026-08-01T12:00:00.000Z"
      />,
    );
    const disabledCard = GuestFlowCard({
      href: "/meu-halloween/individual?eventId=event-1",
      icon: "🧙",
      title: "Fantasia individual",
      description: "Envie sua fantasia.",
      status: { label: "Inscrições congeladas", tone: "unavailable" },
      inactiveReason: "As inscrições foram encerradas.",
    });

    expect(html).toContain("Inscrições em breve");
    expect(html).toContain(
      'href="/meu-halloween/individual?eventId=507f1f77bcf86cd799439011"',
    );
    expect(disabledCard.type).toBe("button");
    (disabledCard.props as unknown as { onClick: () => void }).onClick();
    expect(toastMock.warning).toHaveBeenCalledWith(
      "As inscrições foram encerradas.",
    );
  });

  it("disables costume links in the bottom menu and warns when activated", () => {
    toastMock.warning.mockClear();
    const navigation = GuestBottomNavigation({
      eventId: event._id,
      votingOpen: false,
      contestEntryClosed: true,
    });
    const list = navigation.props.children as ReactElement<{
      children: ReactElement<{
        children: ReactElement<{
          "aria-disabled"?: string;
          onClick?: () => void;
        }>;
      }>[];
    }>;
    const items = list.props.children;
    const individualButton = items[1].props.children;

    expect(individualButton.type).toBe("button");
    expect(individualButton.props["aria-disabled"]).toBe("true");
    individualButton.props.onClick?.();
    expect(toastMock.warning).toHaveBeenCalledWith(
      "Esta opção está indisponível porque as inscrições para o concurso estão encerradas ou congeladas.",
    );
  });
});
