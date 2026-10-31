import { describe, expect, it } from "vitest";
import { ObjectId } from "mongodb";
import { findFirstPlaceTies } from "@/lib/runoff";

describe("runoff candidate selection", () => {
  const tiedCategoryId = new ObjectId("507f1f77bcf86cd799439011");
  const untiedCategoryId = new ObjectId("507f1f77bcf86cd799439012");
  const emptyCategoryId = new ObjectId("507f1f77bcf86cd799439013");
  const candidateA = new ObjectId("507f1f77bcf86cd799439014");
  const candidateB = new ObjectId("507f1f77bcf86cd799439015");
  const candidateC = new ObjectId("507f1f77bcf86cd799439016");

  it("selects only candidates tied for first place in each category", () => {
    const result = findFirstPlaceTies(
      [tiedCategoryId, untiedCategoryId, emptyCategoryId],
      [
        { categoryId: tiedCategoryId, candidateId: candidateA },
        { categoryId: tiedCategoryId, candidateId: candidateA },
        { categoryId: tiedCategoryId, candidateId: candidateB },
        { categoryId: tiedCategoryId, candidateId: candidateB },
        { categoryId: tiedCategoryId, candidateId: candidateC },
        { categoryId: untiedCategoryId, candidateId: candidateC },
        { categoryId: untiedCategoryId, candidateId: candidateC },
        { categoryId: untiedCategoryId, candidateId: candidateA },
      ],
    );

    expect(result).toEqual([
      { categoryId: tiedCategoryId, candidateIds: [candidateA, candidateB] },
    ]);
  });

  it("does not create a runoff for a single candidate or a zero-vote category", () => {
    expect(
      findFirstPlaceTies(
        [tiedCategoryId, emptyCategoryId],
        [{ categoryId: tiedCategoryId, candidateId: candidateA }],
      ),
    ).toEqual([]);
  });
});
