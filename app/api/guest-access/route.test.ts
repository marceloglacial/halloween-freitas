import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ claim: vi.fn(), event: vi.fn() }));
vi.mock("@/lib/auth/guest-registration", async (original) => ({
  ...(await original<object>()),
  claimGuestRegistration: mocks.claim,
}));
vi.mock("@/lib/events", () => ({ getEventById: mocks.event }));
import { POST } from "./route";
import { GuestAccessError } from "@/lib/auth/guest-registration";
const eventId = "507f1f77bcf86cd799439011";
const request = (body: unknown) =>
  new Request("http://localhost/api/guest-access", {
    method: "POST",
    body: JSON.stringify(body),
  });
describe("verified access endpoint", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.event.mockResolvedValue({ _id: eventId });
  });
  it("rejects malformed event input", async () => {
    expect((await POST(request({ email: "ana@example.com" }))).status).toBe(
      400,
    );
  });
  it("does not grant access from a submitted email or voter ID", async () => {
    mocks.claim.mockRejectedValue(
      new GuestAccessError(401, "signed_out", "Entre para continuar."),
    );
    expect(
      (
        await POST(
          request({ eventId, email: "ana@example.com", voterId: "another" }),
        )
      ).status,
    ).toBe(401);
  });
  it("links before voting opens and returns no private fields", async () => {
    mocks.claim.mockResolvedValue({
      userId: "private",
      eventId,
      fullName: "Ana",
      clerkUserId: "private",
      email: "private@example.com",
    });
    const response = await POST(request({ eventId }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ fullName: "Ana" });
  });
  it.each([
    [403, "cancelled"],
    [409, "conflict"],
    [404, "not_registered"],
  ])(
    "reports ownership failures (%s) without account details",
    async (status, code) => {
      mocks.claim.mockRejectedValue(
        new GuestAccessError(status, code, "Peça ajuda ao anfitrião."),
      );
      const response = await POST(request({ eventId }));
      expect(response.status).toBe(status);
      expect(await response.json()).toEqual({
        error: "Peça ajuda ao anfitrião.",
        code,
      });
    },
  );
  it("handles missing events and database failures", async () => {
    mocks.event.mockResolvedValue(null);
    expect((await POST(request({ eventId }))).status).toBe(404);
    mocks.event.mockRejectedValue(new Error("private database detail"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await POST(request({ eventId }));
    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain(
      "private database detail",
    );
    expect(log.mock.calls[0][1]).toMatchObject({ errorType: "Error" });
    expect(JSON.stringify(log.mock.calls)).not.toContain(
      "private database detail",
    );
    log.mockRestore();
  });
});
