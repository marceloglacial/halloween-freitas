import { beforeEach, describe, expect, it, vi } from "vitest";

const { getGuestRegistration, getCurrentEvent, isVotingOpen } = vi.hoisted(
  () => ({
    getGuestRegistration: vi.fn(),
    getCurrentEvent: vi.fn(),
    isVotingOpen: vi.fn(),
  }),
);

vi.mock("@/lib/auth/guest-registration", async (original) => ({
  ...(await original<object>()),
  getGuestRegistration,
}));
vi.mock("@/lib/events", () => ({
  getCurrentEvent,
  isVotingOpen,
}));
vi.mock("@/lib/db", () => ({ getDb: vi.fn() }));
vi.mock("@/lib/users", () => ({ getUserById: vi.fn() }));
vi.mock("@/util/get-categories", () => ({ getCategoryById: vi.fn() }));

import { GuestAccessError } from "@/lib/auth/guest-registration";
import { GET, POST } from "@/app/api/votes/route";
import { getDb } from "@/lib/db";
import { getUserById } from "@/lib/users";
import { getCategoryById } from "@/util/get-categories";
import { MongoServerError } from "mongodb";

describe("vote API authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isVotingOpen.mockReturnValue(true);
    getCurrentEvent.mockResolvedValue({
      _id: "507f1f77bcf86cd799439012",
      status: "active",
    });
  });

  it("rejects requests without a verified Clerk registration", async () => {
    getGuestRegistration.mockRejectedValue(
      new GuestAccessError(401, "signed_out", "Entre para continuar."),
    );
    const response = await POST(
      new Request("http://localhost/api/votes", {
        method: "POST",
        body: JSON.stringify({ categoryId: "x", voteForId: "y" }),
      }),
    );
    expect(response.status).toBe(401);
  });

  it("rejects a session from a different event", async () => {
    getGuestRegistration.mockResolvedValue({
      userId: "507f1f77bcf86cd799439011",
      eventId: "507f1f77bcf86cd799439012",
      fullName: "Guest",
    });
    getCurrentEvent.mockResolvedValue({
      _id: "507f1f77bcf86cd799439013",
      status: "active",
    });
    const response = await POST(
      new Request("http://localhost/api/votes", {
        method: "POST",
        body: JSON.stringify({
          categoryId: "507f1f77bcf86cd799439014",
          voteForId: "507f1f77bcf86cd799439015",
        }),
      }),
    );
    expect(response.status).toBe(403);
  });

  it("rejects votes after an admin ends voting", async () => {
    getGuestRegistration.mockResolvedValue({
      userId: "507f1f77bcf86cd799439011",
      eventId: "507f1f77bcf86cd799439012",
      fullName: "Guest",
    });
    getCurrentEvent.mockResolvedValue({
      _id: "507f1f77bcf86cd799439012",
      status: "active",
      votingStatus: "ended",
    });
    isVotingOpen.mockReturnValue(false);

    const response = await POST(
      new Request("http://localhost/api/votes", {
        method: "POST",
        body: JSON.stringify({
          categoryId: "507f1f77bcf86cd799439014",
          voteForId: "507f1f77bcf86cd799439015",
        }),
      }),
    );

    expect(response.status).toBe(403);
  });

  it("locks existing vote lookup after voting ends", async () => {
    getGuestRegistration.mockResolvedValue({
      userId: "507f1f77bcf86cd799439011",
      eventId: "507f1f77bcf86cd799439012",
      fullName: "Guest",
    });
    getCurrentEvent.mockResolvedValue({
      _id: "507f1f77bcf86cd799439012",
      status: "active",
      votingStatus: "ended",
    });
    isVotingOpen.mockReturnValue(false);

    expect((await GET()).status).toBe(403);
  });

  it("ignores submitted voter identity and preserves duplicate-vote protection", async () => {
    const eventId = "507f1f77bcf86cd799439012";
    const userId = "507f1f77bcf86cd799439011";
    const categoryId = "507f1f77bcf86cd799439014";
    const voteForId = "507f1f77bcf86cd799439015";
    getGuestRegistration.mockResolvedValue({
      eventId,
      userId,
      fullName: "Ana",
    });
    vi.mocked(getCategoryById).mockResolvedValue({
      _id: categoryId,
      eventId,
      title: "Fantasia",
      icon: "🎃",
      order: 1,
      eligibility: "all",
    });
    vi.mocked(getUserById).mockResolvedValue({
      _id: voteForId,
      eventId,
      fullName: "Bia",
      email: "private@example.com",
    });
    const insertOne = vi.fn().mockResolvedValue({});
    vi.mocked(getDb).mockResolvedValue({
      collection: () => ({ insertOne }),
    } as unknown as Awaited<ReturnType<typeof getDb>>);
    const request = () =>
      new Request("http://localhost/api/votes", {
        method: "POST",
        body: JSON.stringify({
          eventId,
          categoryId,
          voteForId,
          voterId: voteForId,
        }),
      });
    expect((await POST(request())).status).toBe(200);
    expect(insertOne.mock.calls[0][0].voterId.toString()).toBe(userId);
    insertOne.mockRejectedValue(
      new MongoServerError({ code: 11000, message: "duplicate vote" }),
    );
    expect((await POST(request())).status).toBe(409);
  });

  it("blocks self-votes, cancelled candidates, wrong-event candidates, and stale selected events", async () => {
    const eventId = "507f1f77bcf86cd799439012";
    const userId = "507f1f77bcf86cd799439011";
    const categoryId = "507f1f77bcf86cd799439014";
    const voteForId = "507f1f77bcf86cd799439015";
    getGuestRegistration.mockResolvedValue({
      eventId,
      userId,
      fullName: "Ana",
    });
    vi.mocked(getCategoryById).mockResolvedValue({
      _id: categoryId,
      eventId,
      title: "Fantasia",
      icon: "🎃",
      order: 1,
      eligibility: "all",
    });
    const request = (target = voteForId, selectedEvent = eventId) =>
      new Request("http://localhost/api/votes", {
        method: "POST",
        body: JSON.stringify({
          eventId: selectedEvent,
          categoryId,
          voteForId: target,
        }),
      });
    expect((await POST(request(userId))).status).toBe(400);
    vi.mocked(getUserById).mockResolvedValue({
      _id: voteForId,
      eventId,
      fullName: "Bia",
      email: "private@example.com",
      status: "cancelled",
    });
    expect((await POST(request())).status).toBe(400);
    vi.mocked(getUserById).mockResolvedValue({
      _id: voteForId,
      eventId: "507f1f77bcf86cd799439019",
      fullName: "Bia",
      email: "private@example.com",
    });
    expect((await POST(request())).status).toBe(404);
    expect(
      (await POST(request(voteForId, "507f1f77bcf86cd799439019"))).status,
    ).toBe(403);
  });
});
