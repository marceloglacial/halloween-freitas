import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentEvent: vi.fn(),
  getEventById: vi.fn(),
  getGuestRegistration: vi.fn(),
  getContestantEntriesForRsvp: vi.fn(),
  contestPhotoPreviewUrl: vi.fn(),
  getCategories: vi.fn(),
  getOpenVotingRound: vi.fn(),
  getDb: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/events", () => ({
  getCurrentEvent: mocks.getCurrentEvent,
  getEventById: mocks.getEventById,
  isVotingOpen: (event: HalloweenEvent) =>
    event.status === "active" && event.votingStatus === "open",
}));
vi.mock("@/lib/auth/guest-registration", () => {
  class GuestAccessError extends Error {
    constructor(
      public status: number,
      public code: string,
      message: string,
    ) {
      super(message);
    }
  }
  return { GuestAccessError, getGuestRegistration: mocks.getGuestRegistration };
});
vi.mock("@/lib/contestant-entries", () => ({
  getContestantEntriesForRsvp: mocks.getContestantEntriesForRsvp,
}));
vi.mock("@/lib/contestant-photos", () => ({
  contestPhotoPreviewUrl: mocks.contestPhotoPreviewUrl,
}));
vi.mock("@/lib/db", () => ({ getDb: mocks.getDb }));
vi.mock("@/lib/voting-rounds", () => ({
  getOpenVotingRound: mocks.getOpenVotingRound,
}));
vi.mock("@/util/get-categories", () => ({
  getCategories: mocks.getCategories,
}));
vi.mock("@/components/feature-unavailable", () => ({
  default: (props: { title: string; message: string }) => ({
    type: "FeatureUnavailable",
    props,
  }),
}));
vi.mock("@/components/guest/guest-portal", () => ({
  default: (props: {
    event: HalloweenEvent;
    guestName: string;
    entries: unknown[];
    categories: Category[];
    votedCategoryIds: string[];
  }) => ({ type: "GuestPortal", props }),
}));

import { GuestAccessError } from "@/lib/auth/guest-registration";
import MeuHalloweenPage from "@/app/meu-halloween/page";

const event: HalloweenEvent = {
  _id: "507f1f77bcf86cd799439011",
  year: 2026,
  slug: "halloween-2026",
  title: "Halloween dos Freitas",
  timezone: "America/Toronto",
  registrationStartsAt: "2026-09-01T00:00:00.000Z",
  eventStartsAt: "2026-10-01T00:00:00.000Z",
  status: "active",
  contestEntryStatus: "open",
  votingStatus: "open",
  resultsPublished: false,
};

const category: Category = {
  _id: "507f1f77bcf86cd799439012",
  eventId: event._id,
  title: "Fantasia mais criativa",
  icon: "🧙",
  order: 0,
  eligibility: "all",
};
const roundId = "507f1f77bcf86cd799439014";

describe("Meu Halloween route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.getCurrentEvent.mockResolvedValue(event);
    mocks.getEventById.mockResolvedValue(event);
    mocks.getGuestRegistration.mockResolvedValue({
      userId: "507f1f77bcf86cd799439013",
      eventId: event._id,
      fullName: "Ana Freitas",
    });
    mocks.getContestantEntriesForRsvp.mockResolvedValue([]);
    mocks.contestPhotoPreviewUrl.mockReturnValue("temporary-photo-preview");
    mocks.getCategories.mockResolvedValue([category]);
    mocks.getOpenVotingRound.mockResolvedValue({
      _id: { toString: () => roundId },
      eventId: event._id,
      categoryIds: [category._id],
      status: "open",
      type: "primary",
    });
    mocks.getDb.mockResolvedValue({
      collection: () => ({
        find: () => ({
          toArray: async () => [
            { categoryId: { toString: () => category._id } },
          ],
        }),
      }),
    });
    mocks.redirect.mockImplementation((url: string) => {
      throw new Error(`REDIRECT:${url}`);
    });
  });

  it("rejects a malformed selected edition before reading guest data", async () => {
    const result = await MeuHalloweenPage({
      searchParams: Promise.resolve({ eventId: "invalid" }),
    });

    expect(result).toMatchObject({ props: { title: "Evento inválido" } });
    expect(mocks.getGuestRegistration).not.toHaveBeenCalled();
  });

  it("sends signed-out and unlinked guests through access with a safe return", async () => {
    mocks.getGuestRegistration.mockRejectedValue(
      new GuestAccessError(403, "unlinked", "Verifique seu acesso."),
    );

    await expect(
      MeuHalloweenPage({ searchParams: Promise.resolve({}) }),
    ).rejects.toThrow(
      `/acesso?eventId=${event._id}&returnTo=%2Fmeu-halloween%3FeventId%3D${event._id}`,
    );
    expect(mocks.redirect).toHaveBeenCalledOnce();
    expect(mocks.getContestantEntriesForRsvp).not.toHaveBeenCalled();
  });

  it("shows a denied state for cancelled guests instead of redirecting repeatedly", async () => {
    mocks.getGuestRegistration.mockRejectedValue(
      new GuestAccessError(403, "cancelled", "Sua confirmação está cancelada."),
    );

    const result = await MeuHalloweenPage({
      searchParams: Promise.resolve({}),
    });

    expect(result).toMatchObject({
      props: { title: "Acesso indisponível" },
    });
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("loads entries for the verified RSVP event", async () => {
    const result = await MeuHalloweenPage({
      searchParams: Promise.resolve({ eventId: event._id }),
    });

    expect(result).toMatchObject({
      props: {
        event,
        guestName: "Ana Freitas",
        entries: [],
      },
    });
    expect(mocks.getGuestRegistration).toHaveBeenCalledWith(event._id);
    expect(mocks.getContestantEntriesForRsvp).toHaveBeenCalledWith(
      event._id,
      "507f1f77bcf86cd799439013",
    );
    expect(mocks.getCategories).not.toHaveBeenCalled();
    expect(mocks.getOpenVotingRound).not.toHaveBeenCalled();
  });

  it("does not read votes or cross-edition data when voting is closed", async () => {
    mocks.getEventById.mockResolvedValue({ ...event, votingStatus: "ended" });

    const result = await MeuHalloweenPage({
      searchParams: Promise.resolve({ eventId: event._id }),
    });

    expect(result).toHaveProperty("props.event", {
      ...event,
      votingStatus: "ended",
    });
    expect(mocks.getContestantEntriesForRsvp).toHaveBeenCalledWith(
      event._id,
      "507f1f77bcf86cd799439013",
    );
    expect(mocks.getDb).not.toHaveBeenCalled();
    expect(mocks.getOpenVotingRound).not.toHaveBeenCalled();
  });

  it("omits private photo data from the guest portal hub", async () => {
    mocks.getContestantEntriesForRsvp.mockResolvedValue([
      {
        _id: "candidate-id",
        categoryId: category._id,
        entryType: "individual",
        displayName: "Ana Freitas",
        status: "draft",
        contestPhoto: {
          assetId: "private-asset-id",
          publicId: "private-cloudinary-id",
          format: "png",
        },
      },
    ]);

    const result = await MeuHalloweenPage({
      searchParams: Promise.resolve({ eventId: event._id }),
    });

    expect(result).toHaveProperty("props.entries", [
      {
        _id: "candidate-id",
        categoryId: category._id,
        entryType: "individual",
        displayName: "Ana Freitas",
        status: "draft",
      },
    ]);
    expect(mocks.contestPhotoPreviewUrl).not.toHaveBeenCalled();
  });
});
