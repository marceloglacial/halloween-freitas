import { beforeEach, describe, expect, it, vi } from "vitest";
import { MongoServerError, ObjectId } from "mongodb";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  currentUser: vi.fn(),
  find: vi.fn(),
  updateOne: vi.fn(),
}));
vi.mock("@clerk/nextjs/server", () => ({
  auth: mocks.auth,
  currentUser: mocks.currentUser,
}));
vi.mock("@/lib/db", () => ({
  getDb: async () => ({
    collection: () => ({ find: mocks.find, updateOne: mocks.updateOne }),
  }),
}));

import {
  claimGuestRegistration,
  getGuestRegistration,
} from "./guest-registration";

const eventId = "507f1f77bcf86cd799439011";
const registration = {
  _id: new ObjectId("507f1f77bcf86cd799439012"),
  eventId: new ObjectId(eventId),
  fullName: "Ana Freitas",
  email: "ana@example.com",
  normalizedEmail: "ana@example.com",
};

describe("verified guest registration", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.auth.mockResolvedValue({ userId: "clerk_ana" });
    mocks.currentUser.mockResolvedValue({
      id: "clerk_ana",
      emailAddresses: [
        {
          emailAddress: "Ana@Example.com",
          verification: { status: "verified" },
        },
      ],
    });
    mocks.find.mockReturnValue({ limit: () => ({ toArray: async () => [] }) });
  });

  it("rejects signed-out requests even if an obsolete guest cookie exists", async () => {
    mocks.auth.mockResolvedValue({ userId: null });
    await expect(getGuestRegistration(eventId)).rejects.toMatchObject({
      status: 401,
    });
  });

  it("reuses the stable link after an email change without changing the display name", async () => {
    mocks.find.mockReturnValue({
      limit: () => ({
        toArray: async () => [{ ...registration, clerkUserId: "clerk_ana" }],
      }),
    });
    mocks.currentUser.mockResolvedValue({
      id: "clerk_ana",
      emailAddresses: [
        {
          emailAddress: "new@example.com",
          verification: { status: "verified" },
        },
      ],
    });
    expect(await getGuestRegistration(eventId)).toMatchObject({
      userId: registration._id.toString(),
      eventId,
      fullName: "Ana Freitas",
    });
  });

  it("links a legacy RSVP using a verified normalized email and preserves its ID", async () => {
    const results = [
      [],
      [registration],
      [{ ...registration, clerkUserId: "clerk_ana" }],
    ];
    mocks.find.mockImplementation(() => ({
      limit: () => ({ toArray: async () => results.shift() }),
    }));
    mocks.updateOne.mockResolvedValue({ matchedCount: 1 });
    expect(await claimGuestRegistration(eventId)).toEqual({
      userId: registration._id.toString(),
      eventId,
      fullName: "Ana Freitas",
    });
  });

  it("never treats an unverified email as registration ownership", async () => {
    mocks.currentUser.mockResolvedValue({
      id: "clerk_ana",
      emailAddresses: [
        {
          emailAddress: "ana@example.com",
          verification: { status: "unverified" },
        },
      ],
    });
    await expect(claimGuestRegistration(eventId)).rejects.toMatchObject({
      status: 403,
      code: "unverified",
    });
  });

  it.each([
    [[], 404],
    [[{ ...registration, clerkUserId: "someone_else" }], 409],
    [[registration, { ...registration, _id: new ObjectId() }], 409],
    [[{ ...registration, status: "cancelled" }], 403],
  ])(
    "rejects unavailable or ambiguous registration matches (%j)",
    async (matches, status) => {
      const results = [[], matches];
      mocks.find.mockImplementation(() => ({
        limit: () => ({ toArray: async () => results.shift() }),
      }));
      await expect(claimGuestRegistration(eventId)).rejects.toMatchObject({
        status,
      });
    },
  );

  it("does not transfer a registration lost to a concurrent claim", async () => {
    const results = [[], [registration], []];
    mocks.find.mockImplementation(() => ({
      limit: () => ({ toArray: async () => results.shift() }),
    }));
    mocks.updateOne.mockResolvedValue({ matchedCount: 0 });
    await expect(claimGuestRegistration(eventId)).rejects.toMatchObject({
      status: 409,
    });
  });

  it("reuses a simultaneous successful claim by the same Clerk account", async () => {
    const results = [
      [],
      [registration],
      [{ ...registration, clerkUserId: "clerk_ana" }],
    ];
    mocks.find.mockImplementation(() => ({
      limit: () => ({ toArray: async () => results.shift() }),
    }));
    mocks.updateOne.mockRejectedValue(
      new MongoServerError({ code: 11000, message: "simultaneous claim" }),
    );
    expect((await claimGuestRegistration(eventId)).userId).toBe(
      registration._id.toString(),
    );
  });

  it("does not attach another RSVP when the identity concurrently links a different record", async () => {
    const results = [
      [],
      [registration],
      [
        {
          ...registration,
          _id: new ObjectId("507f1f77bcf86cd799439099"),
          clerkUserId: "clerk_ana",
        },
      ],
    ];
    mocks.find.mockImplementation(() => ({
      limit: () => ({ toArray: async () => results.shift() }),
    }));
    mocks.updateOne.mockRejectedValue(
      new MongoServerError({ code: 11000, message: "other linked record" }),
    );
    await expect(claimGuestRegistration(eventId)).rejects.toMatchObject({
      status: 409,
    });
  });

  it("rejects cancelled linked registrations and ambiguous existing links", async () => {
    mocks.find.mockReturnValue({
      limit: () => ({
        toArray: async () => [
          { ...registration, status: "cancelled", clerkUserId: "clerk_ana" },
        ],
      }),
    });
    await expect(getGuestRegistration(eventId)).rejects.toMatchObject({
      status: 403,
      code: "cancelled",
    });
    mocks.find.mockReturnValue({
      limit: () => ({ toArray: async () => [registration, registration] }),
    });
    await expect(getGuestRegistration(eventId)).rejects.toMatchObject({
      status: 409,
    });
  });

  it("scopes email matching and claims to the requested event", async () => {
    const results = [
      [],
      [registration],
      [{ ...registration, clerkUserId: "clerk_ana" }],
    ];
    mocks.find.mockImplementation((query) => {
      expect(query.eventId.toString()).toBe(eventId);
      if (query.normalizedEmail)
        expect(query.normalizedEmail.$in).toEqual(["ana@example.com"]);
      return { limit: () => ({ toArray: async () => results.shift() }) };
    });
    mocks.updateOne.mockImplementation(async (query) => {
      expect(query).toMatchObject({
        eventId: new ObjectId(eventId),
        normalizedEmail: "ana@example.com",
        clerkUserId: { $exists: false },
      });
      return { matchedCount: 1 };
    });
    expect((await claimGuestRegistration(eventId)).userId).toBe(
      registration._id.toString(),
    );
  });
});
