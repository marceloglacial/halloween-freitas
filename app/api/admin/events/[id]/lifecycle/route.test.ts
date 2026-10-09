import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  isAdmin: vi.fn(),
  getEventById: vi.fn(),
  updateOne: vi.fn(),
}));

vi.mock("@/lib/auth/admin", () => ({ isAdmin: mocks.isAdmin }));
vi.mock("@/lib/events", () => ({ getEventById: mocks.getEventById }));
vi.mock("@/lib/db", () => ({
  getDb: vi.fn().mockResolvedValue({
    collection: () => ({ updateOne: mocks.updateOne }),
  }),
}));

import { POST } from "@/app/api/admin/events/[id]/lifecycle/route";

const eventId = "507f1f77bcf86cd799439011";

function request(action: string) {
  return POST(
    new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    }),
    { params: Promise.resolve({ id: eventId }) },
  );
}

describe("event lifecycle controls", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-01T00:00:00.000Z"));
    vi.clearAllMocks();
    mocks.isAdmin.mockResolvedValue(true);
    mocks.updateOne.mockResolvedValue({ matchedCount: 1 });
    mocks.getEventById.mockResolvedValue({
      _id: eventId,
      status: "active",
      eventStartsAt: "2026-10-31T23:00:00.000Z",
      contestEntryStatus: "open",
      votingStatus: "ended",
      resultsPublished: false,
    });
  });

  afterEach(() => vi.useRealTimers());

  it("rejects non-admins before mutating an event", async () => {
    mocks.isAdmin.mockResolvedValue(false);
    expect((await request("start-voting")).status).toBe(401);
    expect(mocks.updateOne).not.toHaveBeenCalled();
  });

  it("reopens voting and unpublishes results atomically", async () => {
    const response = await request("start-voting");

    expect(response.status).toBe(200);
    expect(mocks.updateOne).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: expect.anything(),
        status: "active",
        eventStartsAt: { $lte: new Date("2026-11-01T00:00:00.000Z") },
      }),
      {
        $set: expect.objectContaining({
          contestEntryStatus: "closed",
          votingStatus: "open",
          resultsPublished: false,
        }),
      },
    );
  });

  it("closes contest entry atomically before voting", async () => {
    mocks.getEventById.mockResolvedValue({
      _id: eventId,
      status: "active",
      contestEntryStatus: "open",
      votingStatus: "not_started",
    });

    const response = await request("close-contest-entry");

    expect(response.status).toBe(200);
    expect(mocks.updateOne).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: expect.anything(),
        status: "active",
        votingStatus: "not_started",
        $or: expect.arrayContaining([
          { contestEntryStatus: "open" },
          { contestEntryStatus: { $exists: false } },
        ]),
      }),
      {
        $set: expect.objectContaining({ contestEntryStatus: "closed" }),
      },
    );
  });

  it("reopens contest entry only before the first voting opening", async () => {
    mocks.getEventById.mockResolvedValue({
      _id: eventId,
      status: "active",
      contestEntryStatus: "closed",
      votingStatus: "not_started",
    });

    const response = await request("reopen-contest-entry");

    expect(response.status).toBe(200);
    expect(mocks.updateOne).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "active",
        votingStatus: "not_started",
        contestEntryStatus: "closed",
      }),
      {
        $set: expect.objectContaining({ contestEntryStatus: "open" }),
      },
    );
  });

  it("does not reopen contest entry after voting begins", async () => {
    mocks.updateOne.mockResolvedValue({ matchedCount: 0 });
    mocks.getEventById.mockResolvedValue({
      _id: eventId,
      status: "active",
      contestEntryStatus: "closed",
      votingStatus: "open",
    });

    const response = await request("reopen-contest-entry");

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error:
        "As inscrições do concurso foram encerradas com o início da votação",
    });
  });

  it("does not start voting before the event begins", async () => {
    mocks.updateOne.mockResolvedValue({ matchedCount: 0 });
    mocks.getEventById.mockResolvedValue({
      _id: eventId,
      status: "active",
      eventStartsAt: "2026-11-01T00:01:00.000Z",
      votingStatus: "not_started",
      resultsPublished: false,
    });

    const response = await request("start-voting");

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: "A votação só pode começar após o início do evento",
    });
  });

  it("publishes results only after voting has ended", async () => {
    mocks.updateOne.mockResolvedValue({ matchedCount: 0 });
    mocks.getEventById.mockResolvedValue({
      _id: eventId,
      status: "active",
      votingStatus: "open",
      resultsPublished: false,
    });

    const response = await request("publish-results");

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: "Encerre a votação antes de publicar os resultados",
    });
  });

  it("rejects unsupported lifecycle actions", async () => {
    expect((await request("delete-votes")).status).toBe(400);
    expect(mocks.updateOne).not.toHaveBeenCalled();
  });
});
