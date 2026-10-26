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
vi.mock("@/components/logout-button", () => ({
  default: () => <button type="button">Sair</button>,
}));

import FeatureNavigation from "@/components/feature-navigation";

describe("public feature navigation", () => {
  beforeEach(() => {
    mocks.usePathname.mockReset();
    mocks.useAuth.mockReset();
    mocks.useUser.mockReset();
    mocks.useAuth.mockReturnValue({ isLoaded: true, isSignedIn: false });
    mocks.useUser.mockReturnValue({ isLoaded: true, user: null });
  });

  it("is absent on admin routes", () => {
    mocks.usePathname.mockReturnValue("/dashboard/convidados");

    expect(FeatureNavigation({ clerkEnabled: true })).toBeNull();
  });

  it("remains available on public routes", () => {
    mocks.usePathname.mockReturnValue("/");

    expect(FeatureNavigation({ clerkEnabled: true })).toMatchObject({
      type: expect.any(Function),
    });
  });

  it("shows Dashboard in the mobile navigation for a loaded admin", () => {
    mocks.usePathname.mockReturnValue("/");
    mocks.useAuth.mockReturnValue({ isLoaded: true, isSignedIn: true });
    mocks.useUser.mockReturnValue({
      isLoaded: true,
      user: { publicMetadata: { role: "admin" } },
    });

    const markup = renderToStaticMarkup(
      FeatureNavigation({ clerkEnabled: true }),
    );

    expect(markup.match(/href="\/dashboard"/g)).toHaveLength(1);
    expect(markup.match(/>Dashboard<\/a>/g)).toHaveLength(1);
  });

  it.each([
    [
      "signed out",
      { isLoaded: true, isSignedIn: false },
      { isLoaded: true, user: null },
    ],
    [
      "a non-admin",
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
  ])("hides Dashboard for %s", (_state, authState, userState) => {
    mocks.usePathname.mockReturnValue("/");
    mocks.useAuth.mockReturnValue(authState);
    mocks.useUser.mockReturnValue(userState);

    const markup = renderToStaticMarkup(
      FeatureNavigation({ clerkEnabled: true }),
    );

    expect(markup).not.toContain('href="/dashboard"');
    expect(markup).not.toContain(">Dashboard</a>");
  });
});
