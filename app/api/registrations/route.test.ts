import { MongoServerError, ObjectId } from "mongodb";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentEvent: vi.fn(),
  getRegistrationState: vi.fn(),
  getDb: vi.fn(),
  getMongoClient: vi.fn(),
  updateEvent: vi.fn(),
  insertUser: vi.fn(),
  withTransaction: vi.fn(),
  endSession: vi.fn(),
  startSession: vi.fn(),
}));

vi.mock("@/lib/events", () => ({
  getCurrentEvent: mocks.getCurrentEvent,
  getRegistrationState: mocks.getRegistrationState,
}));
vi.mock("@/lib/db", () => ({
  getDb: mocks.getDb,
  getMongoClient: mocks.getMongoClient,
}));

import { POST } from "@/app/api/registrations/route";

const eventId = "507f1f77bcf86cd799439011";
const session = {
  withTransaction: mocks.withTransaction,
  endSession: mocks.endSession,
};

function registrationRequest(
  body: unknown = {
    fullName: "Guest User",
    email: "guest@example.com",
  },
) {
  return new Request("http://localhost/api/registrations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("public RSVP API", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.getCurrentEvent.mockResolvedValue({
      _id: eventId,
      status: "active",
      votingStatus: "not_started",
      contestEntryStatus: "open",
      registrationStartsAt: "2026-09-01T04:00:00.000Z",
    });
    mocks.getRegistrationState.mockReturnValue("open");
    mocks.withTransaction.mockImplementation(async (callback) => callback());
    mocks.updateEvent.mockResolvedValue({ matchedCount: 1 });
    mocks.insertUser.mockResolvedValue({ insertedId: new ObjectId() });
    mocks.startSession.mockReturnValue(session);
    mocks.getMongoClient.mockResolvedValue({
      startSession: mocks.startSession,
    });
    mocks.getDb.mockResolvedValue({
      collection: (name: string) =>
        name === "events"
          ? { updateOne: mocks.updateEvent }
          : { insertOne: mocks.insertUser },
    });
  });

  it("accepts an anonymous adult RSVP and writes it in the cutoff transaction", async () => {
    const response = await POST(registrationRequest());

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      message: "Presença confirmada!",
    });
    expect(mocks.withTransaction).toHaveBeenCalledOnce();
    const [eventFilter, eventUpdate, eventOptions] =
      mocks.updateEvent.mock.calls[0];
    expect(eventFilter).toMatchObject({
      _id: new ObjectId(eventId),
      status: "active",
      votingStatus: "not_started",
    });
    expect(eventFilter.$or).toEqual([
      { registrationStartsAt: { $lte: expect.any(Date) } },
      {
        registrationStartsAt: { $exists: false },
        registrationOpensAt: { $lte: expect.any(Date) },
      },
    ]);
    expect(eventUpdate).toEqual({ $inc: { rsvpMutationVersion: 1 } });
    expect(eventOptions.session).toBe(session);
    expect(mocks.insertUser).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: new ObjectId(eventId),
        fullName: "Guest User",
        email: "guest@example.com",
        normalizedEmail: "guest@example.com",
        contestant: false,
      }),
      { session },
    );
    expect(mocks.endSession).toHaveBeenCalledOnce();
  });

  it("allows late RSVP while contestant entry is closed", async () => {
    mocks.getCurrentEvent.mockResolvedValue({
      _id: eventId,
      status: "active",
      votingStatus: "not_started",
      contestEntryStatus: "closed",
      registrationStartsAt: "2026-09-01T04:00:00.000Z",
    });

    const response = await POST(registrationRequest());

    expect(response.status).toBe(201);
    expect(mocks.insertUser).toHaveBeenCalledWith(
      expect.objectContaining({ contestant: false }),
      { session },
    );
  });

  it("does not create an RSVP when first voting opening wins the cutoff race", async () => {
    mocks.updateEvent.mockResolvedValue({ matchedCount: 0 });

    const response = await POST(registrationRequest());

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: "As inscrições foram encerradas",
    });
    expect(mocks.insertUser).not.toHaveBeenCalled();
    expect(mocks.endSession).toHaveBeenCalledOnce();
  });

  it("rejects requests before the configured opening", async () => {
    mocks.getRegistrationState.mockReturnValue("upcoming");

    const response = await POST(registrationRequest());

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: "As inscrições ainda não estão abertas",
    });
    expect(mocks.getMongoClient).not.toHaveBeenCalled();
  });

  it("rejects requests after the permanent voting cutoff", async () => {
    mocks.getRegistrationState.mockReturnValue("closed");

    const response = await POST(registrationRequest());

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: "As inscrições estão encerradas",
    });
    expect(mocks.getMongoClient).not.toHaveBeenCalled();
  });

  it.each([
    ["malformed JSON", "{"],
    ["a non-object body", "[]"],
  ])("rejects %s", async (_label, body) => {
    const response = await POST(
      new Request("http://localhost/api/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      }),
    );

    expect(response.status).toBe(400);
    expect(mocks.getMongoClient).not.toHaveBeenCalled();
  });

  it.each([
    [{ fullName: "", email: "guest@example.com" }],
    [{ fullName: "Guest User", email: "invalid" }],
    [{ fullName: "a".repeat(121), email: "guest@example.com" }],
  ])("rejects invalid RSVP fields", async (body) => {
    const response = await POST(registrationRequest(body));

    expect(response.status).toBe(400);
    expect(mocks.getMongoClient).not.toHaveBeenCalled();
  });

  it("normalizes email before insertion", async () => {
    const response = await POST(
      registrationRequest({
        fullName: "  Guest   User ",
        email: "  Guest@Example.COM ",
      }),
    );

    expect(response.status).toBe(201);
    expect(mocks.insertUser).toHaveBeenCalledWith(
      expect.objectContaining({
        fullName: "Guest User",
        email: "guest@example.com",
        normalizedEmail: "guest@example.com",
      }),
      { session },
    );
  });

  it("returns the same success response for duplicate email without disclosing registration", async () => {
    mocks.insertUser.mockRejectedValue(
      new MongoServerError({ message: "duplicate key", code: 11000 }),
    );

    const response = await POST(registrationRequest());

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      message: "Presença confirmada!",
    });
  });

  it("returns a generic failure when the database write fails", async () => {
    mocks.insertUser.mockRejectedValue(new Error("database unavailable"));
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await POST(registrationRequest());

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: "Não foi possível realizar a inscrição",
    });
    expect(error).toHaveBeenCalledWith(
      "Registration failed",
      expect.objectContaining({ errorType: "Error" }),
    );
    error.mockRestore();
  });
});
