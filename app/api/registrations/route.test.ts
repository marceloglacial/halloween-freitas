import { MongoServerError, ObjectId } from "mongodb";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentEvent: vi.fn(),
  getRegistrationState: vi.fn(),
  getDb: vi.fn(),
  getMongoClient: vi.fn(),
  consumeRateLimit: vi.fn(),
  trustedClientAddress: vi.fn(),
  updateEvent: vi.fn(),
  findUser: vi.fn(),
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
vi.mock("@/lib/request-rate-limits", () => ({
  consumeRateLimit: mocks.consumeRateLimit,
  rateLimitResponse: (retryAfterSeconds: number) =>
    Response.json(
      { error: "Muitas tentativas. Tente novamente mais tarde." },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
    ),
  requestRateLimitPolicies: {
    rsvpAddress: { action: "rsvp-address", maximum: 60, windowMs: 900000 },
    rsvpEmail: { action: "rsvp-email", maximum: 5, windowMs: 3600000 },
  },
  trustedClientAddress: mocks.trustedClientAddress,
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
    mocks.findUser.mockResolvedValue(null);
    mocks.insertUser.mockResolvedValue({ insertedId: new ObjectId() });
    mocks.startSession.mockReturnValue(session);
    mocks.consumeRateLimit.mockResolvedValue({
      allowed: true,
      retryAfterSeconds: 60,
    });
    mocks.trustedClientAddress.mockReturnValue("203.0.113.8");
    mocks.getMongoClient.mockResolvedValue({
      startSession: mocks.startSession,
    });
    mocks.getDb.mockResolvedValue({
      collection: (name: string) =>
        name === "events"
          ? { updateOne: mocks.updateEvent }
          : { findOne: mocks.findUser, insertOne: mocks.insertUser },
    });
  });

  it("accepts an anonymous adult RSVP and writes it in the cutoff transaction", async () => {
    const response = await POST(registrationRequest());

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      message: "Presença confirmada!",
    });
    expect(mocks.withTransaction).toHaveBeenCalledOnce();
    expect(mocks.consumeRateLimit).toHaveBeenCalledTimes(2);
    expect(mocks.consumeRateLimit).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      expect.objectContaining({ identity: "guest@example.com" }),
    );
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

  it("returns a generic retry response when a request exceeds its limit", async () => {
    mocks.consumeRateLimit
      .mockResolvedValueOnce({ allowed: false, retryAfterSeconds: 43 })
      .mockResolvedValueOnce({ allowed: true, retryAfterSeconds: 60 });

    const response = await POST(registrationRequest());

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("43");
    expect(await response.json()).toEqual({
      error: "Muitas tentativas. Tente novamente mais tarde.",
    });
    expect(mocks.withTransaction).not.toHaveBeenCalled();
    expect(mocks.insertUser).not.toHaveBeenCalled();
  });

  it("fails closed when the trusted proxy address is unavailable", async () => {
    mocks.trustedClientAddress.mockReturnValue(null);

    const response = await POST(registrationRequest());

    expect(response.status).toBe(503);
    expect(mocks.consumeRateLimit).not.toHaveBeenCalled();
    expect(mocks.insertUser).not.toHaveBeenCalled();
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

  it("rejects a duplicate email instead of reporting a second RSVP as confirmed", async () => {
    mocks.insertUser.mockRejectedValue(
      new MongoServerError({ message: "duplicate key", code: 11000 }),
    );

    const response = await POST(registrationRequest());

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: "Este email já confirmou presença nesta edição",
    });
  });

  it("rejects a previously registered email even when the unique index is missing", async () => {
    mocks.findUser.mockResolvedValue({ _id: new ObjectId() });

    const response = await POST(registrationRequest());

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: "Este email já confirmou presença nesta edição",
    });
    expect(mocks.insertUser).not.toHaveBeenCalled();
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
