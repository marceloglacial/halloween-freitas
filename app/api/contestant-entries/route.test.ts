import { beforeEach, describe, expect, it, vi } from "vitest";
import { ObjectId } from "mongodb";

const mocks = vi.hoisted(() => ({
  getGuestRegistration: vi.fn(),
  getEventById: vi.fn(),
  getDb: vi.fn(),
  getMongoClient: vi.fn(),
  createIndividualContestantEntry: vi.fn(),
  createJuniorContestantEntry: vi.fn(),
  logServerError: vi.fn(),
}));

vi.mock("@/lib/auth/guest-registration", () => {
  class GuestAccessError extends Error {
    constructor(
      public status: number,
      public code: string,
      message: string,
    ) {
      super(message);
    }
  }
  return { GuestAccessError, getGuestRegistration: mocks.getGuestRegistration };
});
vi.mock("@/lib/contestant-entry-mutations", () => ({
  ContestantEntryWriteError: class ContestantEntryWriteError extends Error {
    constructor(
      public status: number,
      public code: string,
    ) {
      super(code);
    }
  },
  createIndividualContestantEntry: mocks.createIndividualContestantEntry,
  createJuniorContestantEntry: mocks.createJuniorContestantEntry,
}));
vi.mock("@/lib/db", () => ({
  getDb: mocks.getDb,
  getMongoClient: mocks.getMongoClient,
}));
vi.mock("@/lib/events", () => ({ getEventById: mocks.getEventById }));
vi.mock("@/lib/http", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/http")>();
  return { ...actual, logServerError: mocks.logServerError };
});

import { POST } from "@/app/api/contestant-entries/route";

const eventId = "507f1f77bcf86cd799439011";
const categoryId = "507f1f77bcf86cd799439012";
const rsvpId = "507f1f77bcf86cd799439013";
const entry = {
  _id: new ObjectId("507f1f77bcf86cd799439014"),
  eventId: new ObjectId(eventId),
  categoryId: new ObjectId(categoryId),
  entryType: "individual" as const,
  displayName: "Ana Freitas",
  costumeTitle: "Bruxa",
  status: "draft" as const,
  ownerRsvpId: new ObjectId(rsvpId),
  createdAt: new Date("2026-09-15T00:00:00.000Z"),
  updatedAt: new Date("2026-09-15T00:00:00.000Z"),
};

const event: HalloweenEvent = {
  _id: eventId,
  year: 2026,
  slug: "halloween-2026",
  title: "Halloween dos Freitas",
  timezone: "America/Toronto",
  registrationStartsAt: "2026-09-01T00:00:00.000Z",
  eventStartsAt: "2026-10-31T20:00:00.000Z",
  status: "active",
  contestEntryStatus: "open",
  votingStatus: "not_started",
  resultsPublished: false,
};

function request(body: Record<string, unknown>) {
  return new Request("http://localhost/api/contestant-entries", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("individual contestant entry route", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-15T00:00:00.000Z"));
    vi.clearAllMocks();
    mocks.getEventById.mockResolvedValue(event);
    mocks.getGuestRegistration.mockResolvedValue({
      userId: rsvpId,
      eventId,
      fullName: "Ana Freitas",
    });
    mocks.createIndividualContestantEntry.mockResolvedValue(entry);
    mocks.createJuniorContestantEntry.mockResolvedValue({
      ...entry,
      entryType: "junior",
      displayName: "Bia Freitas",
      guardianRsvpId: new ObjectId(rsvpId),
      ownerRsvpId: undefined,
    });
    mocks.getDb.mockResolvedValue({});
    mocks.getMongoClient.mockResolvedValue({});
  });

  it("creates a private draft from the verified RSVP and selected edition", async () => {
    const response = await POST(
      request({
        eventId,
        categoryId,
        costumeTitle: "  Bruxa   das abóboras ",
        rsvpId: "forged-rsvp",
        displayName: "Nome forjado",
      }),
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      _id: entry._id.toString(),
      categoryId,
      entryType: "individual",
      displayName: "Ana Freitas",
      costumeTitle: "Bruxa",
      status: "draft",
    });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(mocks.createIndividualContestantEntry).toHaveBeenCalledWith(
      {},
      {},
      expect.objectContaining({
        eventId: new ObjectId(eventId),
        categoryId: new ObjectId(categoryId),
        rsvpId: new ObjectId(rsvpId),
        displayName: "Ana Freitas",
        costumeTitle: "Bruxa das abóboras",
      }),
    );
  });

  it("requires a valid event and category", async () => {
    const invalidEvent = await POST(request({ eventId: "bad", categoryId }));
    const invalidCategory = await POST(request({ eventId, categoryId: "bad" }));

    expect(invalidEvent.status).toBe(400);
    expect(invalidCategory.status).toBe(400);
    expect(mocks.getGuestRegistration).not.toHaveBeenCalled();
    expect(mocks.createIndividualContestantEntry).not.toHaveBeenCalled();
  });

  it("denies guests without an RSVP-linked verified account", async () => {
    const GuestAccessError = (await import("@/lib/auth/guest-registration"))
      .GuestAccessError;
    mocks.getGuestRegistration.mockRejectedValue(
      new GuestAccessError(403, "unlinked", "Verifique seu acesso."),
    );

    const response = await POST(
      request({ eventId, categoryId, entryType: "junior", childName: "Bia" }),
    );

    expect(response.status).toBe(403);
    expect(mocks.createIndividualContestantEntry).not.toHaveBeenCalled();
    expect(mocks.createJuniorContestantEntry).not.toHaveBeenCalled();
  });

  it("rejects creation when contestant registration is not open", async () => {
    mocks.getEventById.mockResolvedValue({
      ...event,
      contestEntryStatus: "closed",
    });

    const response = await POST(request({ eventId, categoryId }));

    expect(response.status).toBe(409);
    expect(mocks.createIndividualContestantEntry).not.toHaveBeenCalled();
  });

  it("rejects junior creation after entries close", async () => {
    mocks.getEventById.mockResolvedValue({
      ...event,
      contestEntryStatus: "closed",
    });

    const response = await POST(
      request({ eventId, categoryId, entryType: "junior", childName: "Bia" }),
    );

    expect(response.status).toBe(409);
    expect(mocks.createJuniorContestantEntry).not.toHaveBeenCalled();
  });

  it("turns an ownership uniqueness conflict into a safe conflict response", async () => {
    const { MongoServerError } = await import("mongodb");
    mocks.createIndividualContestantEntry.mockRejectedValue(
      new MongoServerError({ code: 11000, message: "duplicate owner entry" }),
    );

    const response = await POST(request({ eventId, categoryId }));

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: "Você já tem uma inscrição individual nesta edição.",
    });
  });

  it("rejects malformed optional costume titles", async () => {
    const response = await POST(
      request({ eventId, categoryId, costumeTitle: "x".repeat(101) }),
    );

    expect(response.status).toBe(400);
    expect(mocks.createIndividualContestantEntry).not.toHaveBeenCalled();
  });

  it("creates a guardian-owned child draft without trusting a client RSVP id", async () => {
    mocks.createJuniorContestantEntry.mockResolvedValueOnce({
      ...entry,
      entryType: "junior",
      displayName: "Bia Freitas",
      costumeTitle: "Pequena fada",
      guardianRsvpId: new ObjectId(rsvpId),
      ownerRsvpId: undefined,
    });
    const response = await POST(
      request({
        eventId,
        entryType: "junior",
        categoryId,
        childName: "  Bia   Freitas ",
        costumeTitle: "  Pequena fada ",
        guardianRsvpId: "forged-rsvp",
      }),
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({
      entryType: "junior",
      displayName: "Bia Freitas",
      costumeTitle: "Pequena fada",
      status: "draft",
    });
    expect(mocks.createJuniorContestantEntry).toHaveBeenCalledWith(
      {},
      {},
      expect.objectContaining({
        eventId: new ObjectId(eventId),
        categoryId: new ObjectId(categoryId),
        guardianRsvpId: new ObjectId(rsvpId),
        childName: "Bia Freitas",
        costumeTitle: "Pequena fada",
      }),
    );
    expect(mocks.createIndividualContestantEntry).not.toHaveBeenCalled();
  });

  it.each(["", "A", "x".repeat(121)])(
    "rejects an invalid child name without creating an entry",
    async (childName) => {
      const response = await POST(
        request({ eventId, entryType: "junior", categoryId, childName }),
      );

      expect(response.status).toBe(400);
      expect(mocks.createJuniorContestantEntry).not.toHaveBeenCalled();
    },
  );

  it("rejects group creation through the individual and junior endpoint", async () => {
    const response = await POST(
      request({ eventId, entryType: "group", categoryId }),
    );

    expect(response.status).toBe(400);
    expect(mocks.createIndividualContestantEntry).not.toHaveBeenCalled();
    expect(mocks.createJuniorContestantEntry).not.toHaveBeenCalled();
  });
});
