import { beforeEach, describe, expect, it, vi } from "vitest";
import { ObjectId } from "mongodb";

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  find: vi.fn(),
  sort: vi.fn(),
  toArray: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ getDb: mocks.getDb }));

import { getCategories } from "@/util/get-categories";

describe("event category reads", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.getDb.mockResolvedValue({
      collection: () => ({ find: mocks.find }),
    });
    mocks.find.mockReturnValue({ sort: mocks.sort });
    mocks.sort.mockReturnValue({ toArray: mocks.toArray });
    mocks.toArray.mockResolvedValue([]);
  });

  it("scopes the query to one event and requests display ordering", async () => {
    const eventId = new ObjectId();
    const documents = [
      {
        _id: new ObjectId(),
        eventId,
        title: "Melhor Fantasia",
        icon: "🏆",
        order: 0,
        eligibility: "all" as const,
      },
      {
        _id: new ObjectId(),
        eventId,
        title: "Fantasia Mais Assustadora",
        icon: "🧟",
        order: 2,
        eligibility: "all" as const,
      },
    ];
    mocks.toArray.mockResolvedValue(documents);

    const categories = await getCategories(eventId.toString());

    expect(mocks.find).toHaveBeenCalledWith({ eventId });
    expect(mocks.sort).toHaveBeenCalledWith({ order: 1 });
    expect(categories).toEqual(
      documents.map((category) => ({
        _id: category._id.toString(),
        eventId: eventId.toString(),
        title: category.title,
        icon: category.icon,
        order: category.order,
        eligibility: category.eligibility,
      })),
    );
  });
});
