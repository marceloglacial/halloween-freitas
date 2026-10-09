import { describe, expect, it, vi } from "vitest";
import { ObjectId } from "mongodb";
import {
  getFinalVotingRound,
  getFinalVotingRoundForCategory,
  getRoundCandidateIds,
  getOpenVotingRound,
  hasVotedInRoundCategory,
  roundIncludesCategory,
  roundAllowsCandidate,
} from "@/lib/voting-rounds";

describe("voting rounds", () => {
  const eventId = new ObjectId("507f1f77bcf86cd799439011");
  const roundId = new ObjectId("507f1f77bcf86cd799439012");
  const categoryId = new ObjectId("507f1f77bcf86cd799439013");

  it("looks up only an open round in the requested event", async () => {
    const findOne = vi.fn().mockResolvedValue({ _id: roundId });
    const db = {
      collection: vi.fn(() => ({ findOne })),
    } as never;

    await expect(getOpenVotingRound(eventId.toString(), db)).resolves.toEqual({
      _id: roundId,
    });
    expect(findOne).toHaveBeenCalledWith({ eventId, status: "open" });
    await expect(getOpenVotingRound("invalid", db)).resolves.toBeNull();
  });

  it("chooses the most recently ended round for final results", async () => {
    const limit = vi.fn().mockReturnValue({
      toArray: vi.fn().mockResolvedValue([{ _id: roundId }]),
    });
    const sort = vi.fn().mockReturnValue({ limit });
    const find = vi.fn().mockReturnValue({ sort });
    const db = { collection: vi.fn(() => ({ find })) } as never;

    await expect(getFinalVotingRound(eventId.toString(), db)).resolves.toEqual({
      _id: roundId,
    });
    expect(find).toHaveBeenCalledWith({ eventId, status: "ended" });
    expect(sort).toHaveBeenCalledWith({ endedAt: -1, openedAt: -1, _id: -1 });
  });

  it("checks an existing ballot by event, round, voter, and category", async () => {
    const voterId = new ObjectId("507f1f77bcf86cd799439014");
    const findOne = vi.fn().mockResolvedValue({ _id: new ObjectId() });
    const db = { collection: vi.fn(() => ({ findOne })) } as never;

    await expect(
      hasVotedInRoundCategory(
        eventId.toString(),
        roundId,
        voterId.toString(),
        categoryId.toString(),
        db,
      ),
    ).resolves.toBe(true);
    expect(findOne).toHaveBeenCalledWith(
      {
        eventId,
        roundId,
        voterRsvpId: voterId,
        categoryId,
      },
      { projection: { _id: 1 } },
    );
  });

  it("selects a runoff for categories in scope and primary results for others", async () => {
    const otherCategoryId = new ObjectId("507f1f77bcf86cd799439015");
    const candidateId = new ObjectId("507f1f77bcf86cd799439016");
    const runoff = {
      _id: roundId,
      eventId,
      type: "runoff" as const,
      status: "ended" as const,
      categoryIds: [categoryId],
      candidateIdsByCategory: [{ categoryId, candidateIds: [candidateId] }],
      openedAt: new Date("2026-10-31T00:00:00Z"),
    };
    const primary = {
      ...runoff,
      _id: new ObjectId("507f1f77bcf86cd799439017"),
      type: "primary" as const,
      categoryIds: [categoryId, otherCategoryId],
      candidateIdsByCategory: undefined,
    };
    const toArray = vi.fn().mockResolvedValue([runoff, primary]);
    const db = {
      collection: vi.fn(() => ({
        find: () => ({ sort: () => ({ toArray }) }),
      })),
    } as never;

    await expect(
      getFinalVotingRoundForCategory(
        eventId.toString(),
        categoryId.toString(),
        db,
      ),
    ).resolves.toBe(runoff);
    await expect(
      getFinalVotingRoundForCategory(
        eventId.toString(),
        otherCategoryId.toString(),
        db,
      ),
    ).resolves.toBe(primary);
    expect(getRoundCandidateIds(runoff, categoryId.toString())).toEqual([
      candidateId,
    ]);
    expect(
      roundAllowsCandidate(
        runoff,
        eventId.toString(),
        categoryId.toString(),
        candidateId.toString(),
      ),
    ).toBe(true);
    expect(
      roundAllowsCandidate(
        runoff,
        eventId.toString(),
        categoryId.toString(),
        otherCategoryId.toString(),
      ),
    ).toBe(false);
  });

  it("treats malformed voter/category identities as not voted", async () => {
    const findOne = vi.fn();
    const db = { collection: vi.fn(() => ({ findOne })) } as never;
    await expect(
      hasVotedInRoundCategory(
        eventId.toString(),
        roundId,
        "invalid",
        categoryId.toString(),
        db,
      ),
    ).resolves.toBe(false);
    expect(findOne).not.toHaveBeenCalled();
  });

  it("limits categories to the round's edition and frozen category scope", () => {
    expect(
      roundIncludesCategory(
        { eventId, categoryIds: [categoryId] },
        eventId.toString(),
        categoryId.toString(),
      ),
    ).toBe(true);
    expect(
      roundIncludesCategory(
        { eventId, categoryIds: [categoryId] },
        "507f1f77bcf86cd799439014",
        categoryId.toString(),
      ),
    ).toBe(false);
    expect(
      roundIncludesCategory(
        { eventId, categoryIds: [] },
        eventId.toString(),
        categoryId.toString(),
      ),
    ).toBe(false);
  });
});
