import { beforeEach, describe, expect, it, vi } from "vitest";
import { ObjectId } from "mongodb";

const mocks = vi.hoisted(() => ({
  getGuestRegistration: vi.fn(),
  getEventById: vi.fn(),
  getDb: vi.fn(),
  getMongoClient: vi.fn(),
  createGroupContestantEntry: vi.fn(),
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
  createGroupContestantEntry: mocks.createGroupContestantEntry,
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
  entryType: "group" as const,
  displayName: "Família Freitas",
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

describe("group contestant entry route", () => {
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
    mocks.createGroupContestantEntry.mockResolvedValue({
      ...entry,
      costumeTitle: "Família Addams",
    });
    mocks.getDb.mockResolvedValue({});
    mocks.getMongoClient.mockResolvedValue({});
  });

  it("requires a valid event and category", async () => {
    const invalidEvent = await POST(
      request({ eventId: "bad", entryType: "group", categoryId }),
    );
    const invalidCategory = await POST(
      request({
        eventId,
        entryType: "group",
        categoryId: "bad",
        groupName: "Família",
      }),
    );

    expect(invalidEvent.status).toBe(400);
    expect(invalidCategory.status).toBe(400);
    expect(mocks.getGuestRegistration).not.toHaveBeenCalled();
  });

  it("directs individual participation to the photo endpoint", async () => {
    const response = await POST(
      request({ eventId, categoryId, entryType: "individual" }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "A participação individual é criada ao salvar uma foto.",
    });
    expect(mocks.createGroupContestantEntry).not.toHaveBeenCalled();
  });

  it("rejects malformed optional costume titles", async () => {
    const response = await POST(
      request({
        eventId,
        entryType: "group",
        categoryId,
        groupName: "Família",
        costumeTitle: "x".repeat(101),
      }),
    );

    expect(response.status).toBe(400);
    expect(mocks.createGroupContestantEntry).not.toHaveBeenCalled();
  });

  it("creates a group draft from the authenticated RSVP without exposing ownership", async () => {
    const response = await POST(
      request({
        eventId,
        entryType: "group",
        categoryId,
        groupName: "  Família   Freitas ",
        costumeTitle: "  Família Addams ",
        ownerRsvpId: "forged-rsvp",
        members: ["Ana", "Bia"],
      }),
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      _id: entry._id.toString(),
      categoryId,
      entryType: "group",
      displayName: "Família Freitas",
      costumeTitle: "Família Addams",
      status: "draft",
    });
    expect(mocks.createGroupContestantEntry).toHaveBeenCalledWith(
      {},
      {},
      expect.objectContaining({
        eventId: new ObjectId(eventId),
        categoryId: new ObjectId(categoryId),
        ownerRsvpId: new ObjectId(rsvpId),
        groupName: "Família Freitas",
        costumeTitle: "Família Addams",
      }),
    );
  });

  it.each(["", "A", "x".repeat(121)])(
    "rejects an invalid group name without creating an entry",
    async (groupName) => {
      const response = await POST(
        request({ eventId, entryType: "group", categoryId, groupName }),
      );
      expect(response.status).toBe(400);
      expect(mocks.createGroupContestantEntry).not.toHaveBeenCalled();
    },
  );

  it("rejects unknown entry types", async () => {
    const response = await POST(
      request({ eventId, entryType: "unknown", categoryId }),
    );
    expect(response.status).toBe(400);
    expect(mocks.createGroupContestantEntry).not.toHaveBeenCalled();
  });

  it("maps the group ownership uniqueness conflict to a safe response", async () => {
    const { MongoServerError } = await import("mongodb");
    mocks.createGroupContestantEntry.mockRejectedValue(
      new MongoServerError({ code: 11000, message: "duplicate group owner" }),
    );
    const response = await POST(
      request({
        eventId,
        entryType: "group",
        categoryId,
        groupName: "A Família",
      }),
    );
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: "Você já tem uma inscrição de grupo nesta edição.",
    });
  });

  it("rejects group creation after contestant registration closes", async () => {
    mocks.getEventById.mockResolvedValue({
      ...event,
      contestEntryStatus: "closed",
    });
    const response = await POST(
      request({
        eventId,
        entryType: "group",
        categoryId,
        groupName: "A Família",
      }),
    );
    expect(response.status).toBe(409);
    expect(mocks.createGroupContestantEntry).not.toHaveBeenCalled();
  });

  it("denies group creation for a guest without an RSVP-linked account", async () => {
    const GuestAccessError = (await import("@/lib/auth/guest-registration"))
      .GuestAccessError;
    mocks.getGuestRegistration.mockRejectedValue(
      new GuestAccessError(403, "unlinked", "Verifique seu acesso."),
    );
    const response = await POST(
      request({
        eventId,
        entryType: "group",
        categoryId,
        groupName: "A Família",
      }),
    );
    expect(response.status).toBe(403);
    expect(mocks.createGroupContestantEntry).not.toHaveBeenCalled();
  });
});
