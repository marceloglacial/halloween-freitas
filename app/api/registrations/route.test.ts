import { MongoServerError } from "mongodb";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentEvent: vi.fn(),
  getRegistrationState: vi.fn(),
  getDb: vi.fn(),
  insertOne: vi.fn(),
}));

vi.mock("@/lib/events", () => ({
  getCurrentEvent: mocks.getCurrentEvent,
  getRegistrationState: mocks.getRegistrationState,
}));
vi.mock("@/lib/db", () => ({ getDb: mocks.getDb }));

import { POST } from "@/app/api/registrations/route";

function registrationRequest() {
  return new Request("http://localhost/api/registrations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fullName: "Guest User",
      email: "guest@example.com",
    }),
  });
}

describe("registration API window", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.getCurrentEvent.mockResolvedValue({ _id: "event-id" });
    mocks.getDb.mockResolvedValue({
      collection: vi.fn(() => ({ insertOne: mocks.insertOne })),
    });
  });

  it("rejects registration before the configured opening", async () => {
    mocks.getRegistrationState.mockReturnValue("upcoming");
    const response = await POST(registrationRequest());
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: "As inscrições ainda não estão abertas",
    });
    expect(mocks.getDb).not.toHaveBeenCalled();
  });

  it("rejects registration at or after the configured closing", async () => {
    mocks.getRegistrationState.mockReturnValue("closed");
    const response = await POST(registrationRequest());
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: "As inscrições estão encerradas",
    });
    expect(mocks.getDb).not.toHaveBeenCalled();
  });

  it("normalizes registration emails before inserting", async () => {
    mocks.getCurrentEvent.mockResolvedValue({
      _id: "507f1f77bcf86cd799439011",
    });
    mocks.getRegistrationState.mockReturnValue("open");
    mocks.insertOne.mockResolvedValue({
      insertedId: { toString: () => "registration-id" },
    });
    const request = new Request("http://localhost/api/registrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: "Guest User",
        email: "  Guest@Example.COM ",
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(201);
    expect(mocks.insertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "guest@example.com",
        normalizedEmail: "guest@example.com",
      }),
    );
  });

  it("returns a conflict when the database rejects a duplicate", async () => {
    mocks.getCurrentEvent.mockResolvedValue({
      _id: "507f1f77bcf86cd799439011",
    });
    mocks.getRegistrationState.mockReturnValue("open");
    mocks.insertOne.mockRejectedValue(
      new MongoServerError({ message: "duplicate key", code: 11000 }),
    );

    const response = await POST(registrationRequest());

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: "Este email já está inscrito",
    });
  });
});
