import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const mocks = vi.hoisted(() => ({
  pathname: vi.fn(() => "/dashboard"),
  searchParams: vi.fn(() => new URLSearchParams("year=2025")),
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: mocks.pathname,
  useSearchParams: mocks.searchParams,
  useRouter: () => ({ push: mocks.push }),
}));

vi.mock("@/components/logout-button", () => ({
  default: () => <button type="button">Sair</button>,
}));

import AdminDashboardShell from "@/components/dashboard/admin-dashboard-shell";

describe("admin dashboard shell", () => {
  it("keeps a semantic page heading available on narrow layouts", () => {
    const html = renderToStaticMarkup(
      <AdminDashboardShell
        events={[{ year: 2025, title: "Halloween 2025", status: "active" }]}
      >
        <div>Conteúdo</div>
      </AdminDashboardShell>,
    );

    expect(html).toContain(
      '<h1 class="sr-only text-lg font-semibold lg:not-sr-only lg:mr-auto lg:text-left lg:text-xl">Visão geral</h1>',
    );
    expect(html).toContain('aria-current="page"');
    expect(html).toContain('href="/dashboard/convidados?year=2025"');
    expect(html.match(/href="\/"/g)).toHaveLength(2);
    expect(html.match(/target="_blank"/g)).toHaveLength(2);
    expect(html.match(/rel="noreferrer"/g)).toHaveLength(2);
    expect(html.match(/>Ver site<\/a>/g)).toHaveLength(2);
  });
});
