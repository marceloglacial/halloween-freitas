import { describe, expect, it } from "vitest";
import { toPublicUser } from "@/lib/users";

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
});
