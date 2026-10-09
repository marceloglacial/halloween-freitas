import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getGuestRegistration: vi.fn(),
  updateGuestRegistrationName: vi.fn(),
  getEventById: vi.fn(),
}));
vi.mock("@/lib/auth/guest-registration", async (original) => ({
  ...(await original<object>()),
  getGuestRegistration: mocks.getGuestRegistration,
  updateGuestRegistrationName: mocks.updateGuestRegistrationName,
}));
vi.mock("@/lib/events", () => ({ getEventById: mocks.getEventById }));

import { GuestAccessError } from "@/lib/auth/guest-registration";
import { GET, PUT } from "./route";

const eventId = "507f1f77bcf86cd799439011";
const event = {
  _id: eventId,
  title: "Halloween dos Freitas",
  year: 2026,
  status: "active",
  contestEntryStatus: "closed",
  votingStatus: "not_started",
};
const putRequest = (body: unknown) =>
  new Request("http://localhost/api/guest-profile", {
    method: "PUT",
    body: JSON.stringify(body),
  });

describe("guest profile API", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.getEventById.mockResolvedValue(event);
    mocks.getGuestRegistration.mockResolvedValue({ fullName: "Ana Freitas" });
    mocks.updateGuestRegistrationName.mockResolvedValue({
      fullName: "Ana Oliveira",
    });
  });

  it("returns only the signed-in guest profile and selected event status", async () => {
    const response = await GET(
      new Request(`http://localhost/api/guest-profile?eventId=${eventId}`),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      fullName: "Ana Freitas",
      event: {
        title: event.title,
        year: event.year,
        status: event.status,
        contestEntryStatus: event.contestEntryStatus,
        votingStatus: event.votingStatus,
      },
    });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(mocks.getGuestRegistration).toHaveBeenCalledWith(eventId);
  });

  it("rejects access when the server cannot verify the linked guest", async () => {
    mocks.getGuestRegistration.mockRejectedValue(
      new GuestAccessError(403, "unlinked", "Verifique seu acesso."),
    );
    expect(
      (
        await GET(
          new Request(`http://localhost/api/guest-profile?eventId=${eventId}`),
        )
      ).status,
    ).toBe(403);
  });

  it("updates only the normalized RSVP name and ignores submitted identity fields", async () => {
    const response = await PUT(
      putRequest({
        eventId,
        fullName: "  Ana   Oliveira ",
        email: "forged@example.com",
        userId: "another-guest",
      }),
    );
    expect(response.status).toBe(200);
    expect(mocks.updateGuestRegistrationName).toHaveBeenCalledWith(
      eventId,
      "Ana Oliveira",
    );
    const data = await response.json();
    expect(data).not.toHaveProperty("email");
    expect(data).not.toHaveProperty("userId");
  });

  it.each([
    [{ fullName: "Missing event" }],
    [{ eventId: "invalid", fullName: "Name" }],
    [{ eventId, fullName: "" }],
    [{ eventId, fullName: "A".repeat(121) }],
  ])("rejects malformed profile input %j", async (body) => {
    expect((await PUT(putRequest(body))).status).toBe(400);
    expect(mocks.updateGuestRegistrationName).not.toHaveBeenCalled();
  });

  it("does not return another edition's event or profile", async () => {
    mocks.getEventById.mockResolvedValue(null);
    expect(
      (
        await GET(
          new Request(`http://localhost/api/guest-profile?eventId=${eventId}`),
        )
      ).status,
    ).toBe(404);
    expect(mocks.getGuestRegistration).not.toHaveBeenCalled();
  });
});
