import { describe, expect, it, vi } from "vitest";
import { ObjectId } from "mongodb";
import { getFinalVotingRound, getOpenVotingRound, roundIncludesCategory } from "@/lib/voting-rounds";

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
