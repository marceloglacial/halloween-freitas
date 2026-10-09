import { beforeEach, describe, expect, it, vi } from "vitest";
import { ObjectId, MongoServerError } from "mongodb";

const mocks = vi.hoisted(() => ({
  getVotingGuest: vi.fn(),
  getOpenVotingRound: vi.fn(),
  getContestantEntryForVote: vi.fn(),
  getCategoryById: vi.fn(),
  getDb: vi.fn(),
  getMongoClient: vi.fn(),
  roundGuardUpdate: vi.fn(),
  withTransaction: vi.fn(),
  endSession: vi.fn(),
  insertOne: vi.fn(),
  find: vi.fn(),
}));

vi.mock("@/lib/auth/voting-guest", () => ({
  getVotingGuest: mocks.getVotingGuest,
}));
vi.mock("@/lib/voting-rounds", () => ({
  getOpenVotingRound: mocks.getOpenVotingRound,
  roundIncludesCategory: (round: { eventId: ObjectId; categoryIds: ObjectId[] }, eventId: string, categoryId: string) =>
    round.eventId.toString() === eventId &&
    round.categoryIds.some((id) => id.toString() === categoryId),
}));
vi.mock("@/lib/db", async (original) => ({
  ...(await original<object>()),
  getDb: mocks.getDb,
  getMongoClient: mocks.getMongoClient,
}));
vi.mock("@/lib/contestant-entries", () => ({
  getContestantEntryForVote: mocks.getContestantEntryForVote,
}));
vi.mock("@/util/get-categories", () => ({
  getCategoryById: mocks.getCategoryById,
}));

import { GuestAccessError } from "@/lib/auth/guest-registration";
import { GET, POST } from "@/app/api/votes/route";

const eventId = "507f1f77bcf86cd799439012";
const voterRsvpId = "507f1f77bcf86cd799439011";
const roundId = "507f1f77bcf86cd799439013";
const categoryId = "507f1f77bcf86cd799439014";
const candidateId = "507f1f77bcf86cd799439015";

function request(payload: Record<string, unknown> = {}) {
  return new Request("http://localhost/api/votes", {
    method: "POST",
    body: JSON.stringify({
      eventId,
      roundId,
      categoryId,
      candidateId,
      ...payload,
    }),
  });
}

describe("round-scoped vote API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getVotingGuest.mockResolvedValue({ eventId, userId: voterRsvpId });
    mocks.getOpenVotingRound.mockResolvedValue({
      _id: new ObjectId(roundId),
      eventId: new ObjectId(eventId),
      type: "primary",
      status: "open",
      categoryIds: [new ObjectId(categoryId)],
      openedAt: new Date("2026-10-31T23:00:00.000Z"),
    });
    mocks.getCategoryById.mockResolvedValue({
      _id: categoryId,
      eventId,
      title: "Fantasia",
      icon: "🎃",
      order: 1,
      eligibility: "all",
    });
    mocks.getContestantEntryForVote.mockResolvedValue({
      _id: new ObjectId(candidateId),
    });
    mocks.insertOne.mockResolvedValue({ insertedId: new ObjectId() });
    mocks.roundGuardUpdate.mockResolvedValue({ matchedCount: 1 });
    mocks.withTransaction.mockImplementation(
      async (operation: () => Promise<unknown>) => operation(),
    );
    mocks.find.mockReturnValue({ toArray: vi.fn().mockResolvedValue([]) });
    mocks.getDb.mockResolvedValue({
      collection: (name: string) =>
        name === "votingRounds"
          ? { updateOne: mocks.roundGuardUpdate }
          : { insertOne: mocks.insertOne, find: mocks.find },
    });
    mocks.getMongoClient.mockResolvedValue({
      startSession: () => ({
        withTransaction: mocks.withTransaction,
        endSession: mocks.endSession,
      }),
    });
  });

  it("requires a verified guest", async () => {
    mocks.getVotingGuest.mockRejectedValue(
      new GuestAccessError(401, "signed_out", "Entre para continuar."),
    );
    const response = await POST(request());
    expect(response.status).toBe(401);
    expect(mocks.insertOne).not.toHaveBeenCalled();
  });

  it("rejects malformed round, category, or candidate IDs", async () => {
    expect((await POST(request({ roundId: "invalid" }))).status).toBe(400);
    expect((await POST(request({ categoryId: "invalid" }))).status).toBe(400);
    expect((await POST(request({ candidateId: "invalid" }))).status).toBe(400);
    expect(mocks.insertOne).not.toHaveBeenCalled();
  });

  it("rejects an ended or stale round", async () => {
    mocks.getOpenVotingRound.mockResolvedValue(null);
    expect((await POST(request())).status).toBe(409);
    mocks.getOpenVotingRound.mockResolvedValue({
      _id: new ObjectId("507f1f77bcf86cd799439016"),
      eventId: new ObjectId(eventId),
      categoryIds: [new ObjectId(categoryId)],
    });
    expect((await POST(request())).status).toBe(409);
    expect(mocks.insertOne).not.toHaveBeenCalled();
  });

  it("rejects categories outside the round and categories owned by another event", async () => {
    mocks.getOpenVotingRound.mockResolvedValue({
      _id: new ObjectId(roundId),
      eventId: new ObjectId(eventId),
      categoryIds: [new ObjectId("507f1f77bcf86cd799439017")],
    });
    expect((await POST(request())).status).toBe(400);
    mocks.getOpenVotingRound.mockResolvedValue({
      _id: new ObjectId(roundId),
      eventId: new ObjectId(eventId),
      categoryIds: [new ObjectId(categoryId)],
    });
    mocks.getCategoryById.mockResolvedValue({
      _id: categoryId,
      eventId: "507f1f77bcf86cd799439018",
    });
    expect((await POST(request())).status).toBe(404);
    expect(mocks.insertOne).not.toHaveBeenCalled();
  });

  it("accepts only an eligible frozen candidate and derives RSVP identity from session", async () => {
    const response = await POST(request({ voterRsvpId: candidateId }));
    expect(response.status).toBe(200);
    const ballot = mocks.insertOne.mock.calls[0][0];
    expect(ballot).toMatchObject({
      eventId: new ObjectId(eventId),
      roundId: new ObjectId(roundId),
      categoryId: new ObjectId(categoryId),
      voterRsvpId: new ObjectId(voterRsvpId),
      candidateId: new ObjectId(candidateId),
    });
    expect(mocks.getContestantEntryForVote).toHaveBeenCalledWith(
      eventId,
      candidateId,
      expect.objectContaining({ _id: categoryId }),
      voterRsvpId,
    );
    expect(mocks.roundGuardUpdate).toHaveBeenCalledWith(
      {
        _id: new ObjectId(roundId),
        eventId: new ObjectId(eventId),
        status: "open",
        categoryIds: new ObjectId(categoryId),
      },
      { $inc: { ballotMutationVersion: 1 } },
      { session: expect.anything() },
    );
    expect(mocks.withTransaction).toHaveBeenCalledOnce();
    mocks.getContestantEntryForVote.mockResolvedValue(null);
    expect((await POST(request())).status).toBe(400);
  });

  it("serializes vote submission against a concurrent round close", async () => {
    mocks.roundGuardUpdate.mockResolvedValue({ matchedCount: 0 });
    expect((await POST(request())).status).toBe(409);
    expect(mocks.insertOne).not.toHaveBeenCalled();
  });

  it("maps the database uniqueness violation to a conflict", async () => {
    mocks.insertOne.mockRejectedValue(
      new MongoServerError({ code: 11000, message: "duplicate ballot" }),
    );
    expect((await POST(request())).status).toBe(409);
  });

  it("returns only category IDs already cast in the open round", async () => {
    const toArray = vi.fn().mockResolvedValue([
      { categoryId: new ObjectId(categoryId) },
    ]);
    mocks.find.mockReturnValue({ toArray });
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([{ categoryId }]);
    expect(mocks.find).toHaveBeenCalledWith(
      {
        eventId: new ObjectId(eventId),
        roundId: new ObjectId(roundId),
        voterRsvpId: new ObjectId(voterRsvpId),
      },
      { projection: { categoryId: 1 } },
    );
  });
});
