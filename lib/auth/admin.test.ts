import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  clerkClient: vi.fn(),
  getUser: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: mocks.auth,
  clerkClient: mocks.clerkClient,
}));

import { isAdmin } from "@/lib/auth/admin";

describe("admin authorization", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.auth.mockResolvedValue({ userId: "clerk-user" });
    mocks.clerkClient.mockResolvedValue({
      users: { getUser: mocks.getUser },
    });
  });

  it("denies requests without an authenticated user", async () => {
    mocks.auth.mockResolvedValue({ userId: null });

    await expect(isAdmin()).resolves.toBe(false);
    expect(mocks.clerkClient).not.toHaveBeenCalled();
  });

  it("accepts only the exact public admin role", async () => {
    mocks.getUser.mockResolvedValue({ publicMetadata: { role: "admin" } });

    await expect(isAdmin()).resolves.toBe(true);
    expect(mocks.getUser).toHaveBeenCalledWith("clerk-user");

    mocks.getUser.mockResolvedValue({
      publicMetadata: { role: "Admin" },
      privateMetadata: { role: "admin" },
    });
    await expect(isAdmin("clerk-user")).resolves.toBe(false);
  });

  it("fails closed when Clerk cannot verify the role", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.getUser.mockRejectedValue(new Error("sensitive provider detail"));

    try {
      await expect(isAdmin("clerk-user")).resolves.toBe(false);
      expect(JSON.stringify(errorSpy.mock.calls)).not.toContain(
        "sensitive provider detail",
      );
    } finally {
      errorSpy.mockRestore();
    }
  });
});
