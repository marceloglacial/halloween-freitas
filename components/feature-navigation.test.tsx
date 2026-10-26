import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const mocks = vi.hoisted(() => ({
  usePathname: vi.fn(),
  useAuth: vi.fn(),
  useUser: vi.fn(),
}));

vi.mock("next/navigation", () => ({ usePathname: mocks.usePathname }));
vi.mock("@clerk/nextjs", () => ({
  useAuth: mocks.useAuth,
  useUser: mocks.useUser,
}));

import FeatureNavigation from "@/components/feature-navigation";

describe("public admin shortcut", () => {
  beforeEach(() => {
    mocks.usePathname.mockReset();
    mocks.useAuth.mockReset();
    mocks.useUser.mockReset();
    mocks.usePathname.mockReturnValue("/");
    mocks.useAuth.mockReturnValue({ isLoaded: true, isSignedIn: false });
    mocks.useUser.mockReturnValue({ isLoaded: true, user: null });
  });

  it("renders only a fixed Admin link for a loaded administrator", () => {
    mocks.useAuth.mockReturnValue({ isLoaded: true, isSignedIn: true });
    mocks.useUser.mockReturnValue({
      isLoaded: true,
      user: { publicMetadata: { role: "admin" } },
    });

    const markup = renderToStaticMarkup(
      FeatureNavigation({ clerkEnabled: true }),
    );

    expect(markup).toContain('href="/dashboard"');
    expect(markup).toContain(">Admin</a>");
    expect(markup).toContain(
      "fixed top-[calc(env(safe-area-inset-top)+0.75rem)]",
    );
    expect(markup).not.toContain("<nav");
    expect(markup).not.toContain("<dialog");
    expect(markup).not.toContain("Abrir menu de navegação");
    expect(markup).not.toContain("Entrar");
    expect(markup).not.toContain("Sair");
  });

  it.each([
    [
      "a signed-out visitor",
      { isLoaded: true, isSignedIn: false },
      { isLoaded: true, user: null },
    ],
    [
      "a guest",
      { isLoaded: true, isSignedIn: true },
      { isLoaded: true, user: { publicMetadata: { role: "guest" } } },
    ],
    [
      "a loading role",
      { isLoaded: true, isSignedIn: true },
      { isLoaded: false, user: null },
    ],
    [
      "an unresolved session",
      { isLoaded: false, isSignedIn: undefined },
      { isLoaded: false, user: null },
    ],
  ])("shows nothing for %s", (_state, authState, userState) => {
    mocks.useAuth.mockReturnValue(authState);
    mocks.useUser.mockReturnValue(userState);

    expect(
      renderToStaticMarkup(FeatureNavigation({ clerkEnabled: true })),
    ).toBe("");
  });

  it.each([
    "/dashboard/convidados",
    "/meu-halloween",
    "/resultados",
    "/votacao",
  ])("does not render on private route %s", (pathname) => {
    mocks.usePathname.mockReturnValue(pathname);
    mocks.useAuth.mockReturnValue({ isLoaded: true, isSignedIn: true });
    mocks.useUser.mockReturnValue({
      isLoaded: true,
      user: { publicMetadata: { role: "admin" } },
    });

    expect(FeatureNavigation({ clerkEnabled: true })).toBeNull();
  });

  it("does not access Clerk when the integration is disabled", () => {
    expect(FeatureNavigation({ clerkEnabled: false })).toBeNull();
  });
});
