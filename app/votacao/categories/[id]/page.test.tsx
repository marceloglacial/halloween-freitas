import { beforeEach, describe, expect, it, vi } from "vitest";
import { ObjectId } from "mongodb";

const mocks = vi.hoisted(() => ({
  getCurrentEvent: vi.fn(),
  isVotingOpen: vi.fn(),
  getGuestRegistration: vi.fn(),
  guestAccessUrl: vi.fn(),
  validGuestEventId: vi.fn(),
  getVotingCandidatesForCategory: vi.fn(),
  getCategoryById: vi.fn(),
  getOpenVotingRound: vi.fn(),
  hasVotedInRoundCategory: vi.fn(),
}));

vi.mock("@/lib/events", () => ({
  getCurrentEvent: mocks.getCurrentEvent,
  isVotingOpen: mocks.isVotingOpen,
}));
vi.mock("@/lib/auth/guest-registration", () => ({
  getGuestRegistration: mocks.getGuestRegistration,
  GuestAccessError: class GuestAccessError extends Error {},
}));
vi.mock("@/util/guest-access", () => ({
  guestAccessUrl: mocks.guestAccessUrl,
  validGuestEventId: mocks.validGuestEventId,
}));
vi.mock("@/lib/contestant-entries", () => ({
  getVotingCandidatesForCategory: mocks.getVotingCandidatesForCategory,
}));
vi.mock("@/util/get-categories", () => ({
  getCategoryById: mocks.getCategoryById,
}));
vi.mock("@/lib/voting-rounds", () => ({
  getOpenVotingRound: mocks.getOpenVotingRound,
  hasVotedInRoundCategory: mocks.hasVotedInRoundCategory,
  roundIncludesCategory: () => true,
}));
vi.mock("@/components/back-button", () => ({ default: () => null }));
vi.mock("@/components/votacao/vote-grid", () => ({ default: () => null }));
vi.mock("@/components/feature-unavailable", () => ({
  default: (props: { title: string; message: string }) => props,
}));
vi.mock("next/navigation", () => ({
  notFound: vi.fn(),
  redirect: vi.fn(),
}));

import CategoryPage from "@/app/votacao/categories/[id]/page";

const eventId = "507f1f77bcf86cd799439011";
const categoryId = "507f1f77bcf86cd799439012";
const rsvpId = "507f1f77bcf86cd799439013";
const roundId = new ObjectId("507f1f77bcf86cd799439014");

describe("voting category page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentEvent.mockResolvedValue({ _id: eventId });
    mocks.isVotingOpen.mockReturnValue(true);
    mocks.getGuestRegistration.mockResolvedValue({
      eventId,
      userId: rsvpId,
      fullName: "Convidado",
    });
    mocks.validGuestEventId.mockReturnValue(true);
    mocks.getCategoryById.mockResolvedValue({
      _id: categoryId,
      eventId,
      title: "Fantasia",
      icon: "🎃",
    });
    mocks.getOpenVotingRound.mockResolvedValue({
      _id: roundId,
      eventId: new ObjectId(eventId),
      type: "primary",
      status: "open",
      categoryIds: [new ObjectId(categoryId)],
      openedAt: new Date(),
    });
    mocks.hasVotedInRoundCategory.mockResolvedValue(false);
    mocks.getVotingCandidatesForCategory.mockResolvedValue([]);
  });

  it("does not show a completed category after a round is reopened", async () => {
    mocks.hasVotedInRoundCategory.mockResolvedValue(true);

    const result = await CategoryPage({
      params: Promise.resolve({ id: categoryId }),
      searchParams: Promise.resolve({ eventId }),
    });

    expect(result.props).toMatchObject({
      title: "Categoria concluída",
      message: "Você já registrou seu voto nesta categoria.",
    });
    expect(mocks.getVotingCandidatesForCategory).not.toHaveBeenCalled();
    expect(mocks.hasVotedInRoundCategory).toHaveBeenCalledWith(
      eventId,
      roundId,
      rsvpId,
      categoryId,
    );
  });

  it("continues to show an unfinished category", async () => {
    const result = await CategoryPage({
      params: Promise.resolve({ id: categoryId }),
      searchParams: Promise.resolve({ eventId }),
    });

    expect(result.type).toBe("section");
    expect(mocks.getVotingCandidatesForCategory).toHaveBeenCalledWith(
      eventId,
      expect.objectContaining({ _id: categoryId }),
      rsvpId,
    );
  });
});
