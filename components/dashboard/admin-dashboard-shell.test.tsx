import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const mocks = vi.hoisted(() => ({
  pathname: vi.fn(() => "/dashboard"),
  searchParams: vi.fn(() => new URLSearchParams("year=2025")),
  push: vi.fn(),
  user: vi.fn(() => ({
    isLoaded: true,
    user: {
      firstName: "Ana" as string | null,
      imageUrl: null as string | null,
    },
  })),
}));

vi.mock("next/navigation", () => ({
  usePathname: mocks.pathname,
  useSearchParams: mocks.searchParams,
  useRouter: () => ({ push: mocks.push }),
}));

vi.mock("@clerk/nextjs", () => ({ useUser: mocks.user }));
vi.mock("@/util/fonts", () => ({
  secondaryFont: { className: "font-metal-mania" },
}));

vi.mock("@/components/logout-button", () => ({
  default: () => <button type="button">Sair</button>,
}));

import AdminDashboardShell from "@/components/dashboard/admin-dashboard-shell";

describe("admin dashboard shell", () => {
  it("leaves the section heading to the page content", () => {
    const html = renderToStaticMarkup(
      <AdminDashboardShell
        events={[{ year: 2025, title: "Halloween 2025", status: "active" }]}
      >
        <div>Conteúdo</div>
      </AdminDashboardShell>,
    );

    expect(html).not.toContain("<h1");
    expect(html).toContain("Halloween 2025");
    expect(
      html.match(/aria-hidden="true" class="text-gray-500">\|<\/span>/g),
    ).toHaveLength(2);
    expect(html).toContain('aria-current="page"');
    expect(html).toContain('href="/dashboard/convidados?year=2025"');
    expect(html).not.toContain('aria-label="Seleção de edição"');
    expect(html).toContain('aria-label="Navegação administrativa principal"');
    expect(html).toContain("fixed inset-x-0 bottom-0");
    expect(html).toContain("pb-[env(safe-area-inset-bottom)]");
    expect(html).toContain(
      '<main class="mx-auto w-full max-w-7xl px-4 pt-6 pb-24',
    );
    expect(html).toContain('href="/dashboard/galeria?year=2025"');
    expect(html).toContain('aria-label="Abrir menu da conta de Ana"');
    expect(html).toContain('href="/dashboard/configuracoes?year=2025"');
    expect(html).toContain('id="admin-account-menu" hidden=""');
    expect(html.match(/href="\/"/g)).toHaveLength(2);
    expect(html.match(/target="_blank"/g)).toHaveLength(2);
    expect(html.match(/rel="noreferrer"/g)).toHaveLength(2);
    expect(html.match(/>Ver site<\/a>/g)).toHaveLength(2);
    const mobileNavigation = html.match(
      /<nav aria-label="Navegação administrativa principal"[\s\S]*?<\/nav>/,
    )?.[0];
    expect(mobileNavigation).toContain("Visão Geral");
    expect(mobileNavigation).toContain("Convidados");
    expect(mobileNavigation).toContain("Concursos");
    expect(mobileNavigation).toContain("Votação");
    expect(mobileNavigation).toContain("Galeria");
    expect(mobileNavigation).toContain("Configurações");
    expect(mobileNavigation?.match(/<svg aria-hidden="true"/g)).toHaveLength(6);
    expect(mobileNavigation).not.toMatch(/[🏚️👥🎭🗳️📸⚙️]/u);
    expect(
      mobileNavigation?.indexOf('aria-label="Configurações"'),
    ).toBeGreaterThan(mobileNavigation?.indexOf('aria-label="Galeria"') ?? -1);

    const accountMenu = html.match(
      /<div id="admin-account-menu"[^>]*>([\s\S]*?)<\/div>/,
    )?.[1];
    expect(accountMenu).not.toContain("Configurações");
    expect(accountMenu).not.toContain("Ver site");
    expect(accountMenu).toContain("Sair");
  });

  it("shows the edition selector only on settings", () => {
    mocks.pathname.mockReturnValueOnce("/dashboard/configuracoes");

    const html = renderToStaticMarkup(
      <AdminDashboardShell
        events={[{ year: 2025, title: "Halloween 2025", status: "active" }]}
      >
        <div>Conteúdo</div>
      </AdminDashboardShell>,
    );

    expect(html.match(/aria-label="Seleção de edição"/g)).toHaveLength(2);
    expect(html).toContain('aria-label="Selecionar edição, ano 2025"');
    expect(html).toContain('href="/dashboard/configuracoes?year=2025"');
  });

  it("shows an initial and a default label when the Clerk profile has no name or image", () => {
    mocks.user.mockReturnValueOnce({
      isLoaded: true,
      user: { firstName: null, imageUrl: null },
    });

    const html = renderToStaticMarkup(
      <AdminDashboardShell events={[]}>
        <div>Conteúdo</div>
      </AdminDashboardShell>,
    );

    expect(html).toContain('aria-label="Abrir menu da conta de Admin"');
    expect(html).toContain('<span aria-hidden="true">A</span>');
  });
});
