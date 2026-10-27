import { ObjectId } from "mongodb";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  categoryFindOne: vi.fn(),
  contestantFind: vi.fn(),
  contestantsToArray: vi.fn(),
  votesToArray: vi.fn(),
  getDb: vi.fn(),
  previewUrl: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ getDb: mocks.getDb }));
vi.mock("@/lib/contestant-photos", () => ({
  contestPhotoPreviewUrl: mocks.previewUrl,
}));

import { getCategoryResults } from "@/lib/results";

const eventId = new ObjectId("507f1f77bcf86cd799439011");
const categoryId = new ObjectId("507f1f77bcf86cd799439012");
const roundId = new ObjectId("507f1f77bcf86cd799439013");

function contestant({
  name,
  entryType = "individual",
  category = categoryId,
  photo = false,
}: {
  name: string;
  entryType?: "individual" | "group";
  category?: ObjectId;
  photo?: boolean;
}) {
  return {
    _id: new ObjectId(),
    eventId,
    categoryId: category,
    entryType,
    displayName: name,
    status: "locked",
    ...(photo
      ? { contestPhoto: { publicId: `${name}-photo`, format: "jpg" } }
      : {}),
  };
}

describe("public category results", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.categoryFindOne.mockResolvedValue({ eligibility: "all" });
    mocks.contestantFind.mockReturnValue({ toArray: mocks.contestantsToArray });
    mocks.getDb.mockResolvedValue({
      collection(name: string) {
        if (name === "categories") {
          return { findOne: mocks.categoryFindOne };
        }
        if (name === "contestants") {
          return { find: mocks.contestantFind };
        }
        if (name === "votes") {
          return {
            aggregate: () => ({ toArray: mocks.votesToArray }),
          };
        }
        throw new Error(`Unexpected collection: ${name}`);
      },
    });
    mocks.previewUrl.mockImplementation(
      (publicId: string) => `signed:${publicId}`,
    );
    mocks.votesToArray.mockResolvedValue([]);
  });

  it("includes locked eligible candidates with zero votes and photo URLs", async () => {
    const winner = contestant({ name: "Ana", photo: true });
    const noVotes = contestant({ name: "Beatriz" });
    mocks.contestantsToArray.mockResolvedValue([noVotes, winner]);
    mocks.votesToArray.mockResolvedValue([{ _id: winner._id, votes: 3 }]);

    const results = await getCategoryResults(
      eventId.toString(),
      categoryId.toString(),
      roundId.toString(),
    );

    expect(mocks.contestantFind).toHaveBeenCalledWith({
      eventId,
      status: "locked",
      $or: [{ categoryId }, { entryType: "individual" }],
    });
    expect(results).toMatchObject({
      totalVotes: 3,
      users: [
        { fullName: "Ana", votes: 3, imageUrl: "signed:Ana-photo" },
        { fullName: "Beatriz", votes: 0, imageUrl: null },
      ],
    });
  });

  it("limits group-only categories to locked groups in that category", async () => {
    mocks.categoryFindOne.mockResolvedValue({ eligibility: "group" });
    mocks.contestantsToArray.mockResolvedValue([]);

    const results = await getCategoryResults(
      eventId.toString(),
      categoryId.toString(),
      roundId.toString(),
    );

    expect(mocks.contestantFind).toHaveBeenCalledWith({
      eventId,
      status: "locked",
      categoryId,
      entryType: "group",
    });
    expect(results).toEqual({ users: [], totalVotes: 0 });
    expect(mocks.votesToArray).not.toHaveBeenCalled();
  });

  it("returns no results for a category outside the selected event", async () => {
    mocks.categoryFindOne.mockResolvedValue(null);

    const results = await getCategoryResults(
      eventId.toString(),
      categoryId.toString(),
      roundId.toString(),
    );

    expect(results).toEqual({ users: [], totalVotes: 0 });
    expect(mocks.contestantFind).not.toHaveBeenCalled();
  });
});
