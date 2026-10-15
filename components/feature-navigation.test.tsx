import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ usePathname: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: mocks.usePathname }));

import FeatureNavigation from "@/components/feature-navigation";

describe("public feature navigation", () => {
  beforeEach(() => mocks.usePathname.mockReset());

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
});
