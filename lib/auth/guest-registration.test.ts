import { beforeEach, describe, expect, it, vi } from "vitest";
import { ObjectId } from "mongodb";

const mocks = vi.hoisted(() => ({
  cookies: vi.fn(),
  findOne: vi.fn(),
  updateOne: vi.fn(),
  event: vi.fn(),
}));
vi.mock("next/headers", () => ({ cookies: mocks.cookies }));
vi.mock("@/lib/db", () => ({
  getDb: async () => ({
    collection: () => ({ findOne: mocks.findOne, updateOne: mocks.updateOne }),
  }),
}));
vi.mock("@/lib/events", () => ({ getEventById: mocks.event }));

import {
  createGuestSession,
  getGuestRegistration,
  updateGuestRegistrationName,
} from "./guest-registration";

const eventId = "507f1f77bcf86cd799439011";
const registration = {
  _id: new ObjectId("507f1f77bcf86cd799439012"),
  eventId: new ObjectId(eventId),
  fullName: "Ana Freitas",
  email: "ana@example.com",
  normalizedEmail: "ana@example.com",
};

function installSession() {
  const token = createGuestSession(registration._id.toString(), eventId);
  mocks.cookies.mockResolvedValue({ get: () => ({ value: token }) });
}

describe("guest registration session", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.GUEST_SESSION_SECRET = "test-only-session-secret";
    mocks.cookies.mockResolvedValue({ get: () => undefined });
    mocks.findOne.mockResolvedValue(registration);
    mocks.event.mockResolvedValue({
      _id: eventId,
      status: "active",
      contestEntryStatus: "open",
      votingStatus: "not_started",
    });
  });

  it("rejects requests without the guest session cookie", async () => {
    await expect(getGuestRegistration(eventId)).rejects.toMatchObject({
      status: 401,
      code: "signed_out",
    });
  });

  it("rejects a session scoped to another event", async () => {
    const token = createGuestSession(registration._id.toString(), "507f1f77bcf86cd799439099");
    mocks.cookies.mockResolvedValue({ get: () => ({ value: token }) });

    await expect(getGuestRegistration(eventId)).rejects.toMatchObject({
      status: 401,
      code: "signed_out",
    });
    expect(mocks.findOne).not.toHaveBeenCalled();
  });

  it("returns only the linked RSVP identity for the requested event", async () => {
    installSession();

    await expect(getGuestRegistration(eventId)).resolves.toEqual({
      userId: registration._id.toString(),
      eventId,
      fullName: "Ana Freitas",
    });
    expect(mocks.findOne).toHaveBeenCalledWith({
      _id: registration._id,
      eventId: new ObjectId(eventId),
    });
  });

  it("rejects a cancelled RSVP", async () => {
    installSession();
    mocks.findOne.mockResolvedValue({ ...registration, status: "cancelled" });

    await expect(getGuestRegistration(eventId)).rejects.toMatchObject({
      status: 403,
      code: "cancelled",
    });
  });

  it("updates the RSVP name while keeping a closed contestant name frozen", async () => {
    installSession();
    const candidate = { ...registration, contestant: true };
    mocks.findOne.mockResolvedValue(candidate);
    mocks.event.mockResolvedValue({
      _id: eventId,
      status: "active",
      contestEntryStatus: "closed",
      votingStatus: "not_started",
    });
    mocks.updateOne.mockResolvedValue({ matchedCount: 1 });

    await expect(
      updateGuestRegistrationName(eventId, "Ana Oliveira"),
    ).resolves.toMatchObject({ fullName: "Ana Oliveira" });
    expect(mocks.updateOne).toHaveBeenCalledWith(
      {
        _id: registration._id,
        eventId: new ObjectId(eventId),
        status: { $ne: "cancelled" },
      },
      {
        $set: {
          fullName: "Ana Oliveira",
          contestantName: "Ana Freitas",
          updatedAt: expect.any(Date),
        },
      },
    );
  });
});
