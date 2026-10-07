import { describe, expect, it, vi } from "vitest";
import { ObjectId } from "mongodb";
const { documents } = vi.hoisted(() => ({ documents: vi.fn() }));
vi.mock("@/lib/db", () => ({
  getDb: async () => ({
    collection: () => ({
      find: () => ({ sort: () => ({ toArray: documents }) }),
    }),
  }),
}));
import {
  getPublicUsersForEvent,
  getPublicVotingUsersForEvent,
  toPublicUser,
} from "@/lib/users";

describe("public user serialization", () => {
  it("never includes an email address", () => {
    const user: User = {
      _id: "user",
      eventId: "event",
      fullName: "Ana Freitas",
      email: "private@example.com",
    };
    expect(toPublicUser(user)).not.toHaveProperty("email");
  });
  it("excludes Clerk ownership and attendance status even if the input is an admin user", () => {
    const user: AdminUser = {
      _id: "user",
      eventId: "event",
      fullName: "Ana",
      email: "private@example.com",
      clerkUserId: "clerk_private",
      status: "cancelled",
    };
    expect(toPublicUser(user)).toEqual({
      _id: "user",
      eventId: "event",
      fullName: "Ana",
      imageUrl: undefined,
      group: undefined,
      junior: undefined,
    });
  });
  it("excludes cancelled voting candidates without hiding historical portraits", async () => {
    const eventId = new ObjectId("507f1f77bcf86cd799439011");
    documents.mockResolvedValue([
      {
        _id: new ObjectId("507f1f77bcf86cd799439012"),
        eventId,
        fullName: "Ana",
        email: "private@example.com",
        normalizedEmail: "private@example.com",
        clerkUserId: "clerk_private",
      },
      {
        _id: new ObjectId("507f1f77bcf86cd799439013"),
        eventId,
        fullName: "Bia",
        email: "other@example.com",
        normalizedEmail: "other@example.com",
        status: "cancelled",
      },
    ]);
    expect(
      (await getPublicVotingUsersForEvent(eventId.toString())).map(
        (user) => user.fullName,
      ),
    ).toEqual(["Ana"]);
    expect(
      (await getPublicUsersForEvent(eventId.toString())).map(
        (user) => user.fullName,
      ),
    ).toEqual(["Ana", "Bia"]);
  });
});
