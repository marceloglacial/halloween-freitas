import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db";

export type UserDocument = Omit<User, "_id" | "eventId"> & {
  _id: ObjectId;
  eventId: ObjectId;
  normalizedEmail: string;
  clerkUserId?: string;
  contestantName?: string;
  status?: "confirmed" | "cancelled";
};

export function serializeUser(user: UserDocument): User {
  return {
    _id: user._id.toString(),
    eventId: user.eventId.toString(),
    fullName: user.fullName,
    email: user.email,
    imageUrl: user.imageUrl,
    ...(user.contestant !== undefined ? { contestant: user.contestant } : {}),
    group: Boolean(user.group),
    ...(user.status ? { status: user.status } : {}),
  };
}

export function toPublicUser(
  user: User & { contestantName?: string },
): PublicUser {
  return {
    _id: user._id,
    eventId: user.eventId,
    fullName:
      user.contestant && user.contestantName
        ? user.contestantName
        : user.fullName,
    imageUrl: user.imageUrl,
    group: user.group,
  };
}

export async function getUsersForEvent(eventId: string): Promise<User[]> {
  const db = await getDb();
  const users = await db
    .collection<UserDocument>("users")
    .find({ eventId: new ObjectId(eventId) })
    .sort({ fullName: 1 })
    .toArray();
  return users.map(serializeUser);
}

export async function getPublicUsersForEvent(eventId: string) {
  const users = await (
    await getDb()
  )
    .collection<UserDocument>("users")
    .find({ eventId: new ObjectId(eventId) })
    .sort({ fullName: 1 })
    .toArray();
  return users.map((user) =>
    toPublicUser({
      ...serializeUser(user),
      contestantName: user.contestantName,
    }),
  );
}

export async function getPublicVotingUsersForEvent(eventId: string) {
  const users = await (
    await getDb()
  )
    .collection<UserDocument>("users")
    .find({ eventId: new ObjectId(eventId) })
    .sort({ fullName: 1 })
    .toArray();
  return users
    .filter((user) => user.status !== "cancelled" && user.contestant !== false)
    .map((user) =>
      toPublicUser({
        ...serializeUser(user),
        contestantName: user.contestantName,
      }),
    );
}

export async function getAdminUsersForEvent(
  eventId: string,
): Promise<AdminUser[]> {
  const users = await (
    await getDb()
  )
    .collection<UserDocument>("users")
    .find({ eventId: new ObjectId(eventId) })
    .sort({ fullName: 1 })
    .toArray();
  return users.map((user) => ({
    ...serializeUser(user),
    ...(user.clerkUserId ? { clerkUserId: user.clerkUserId } : {}),
  }));
}

export async function getUserByEmail(eventId: string, normalizedEmail: string) {
  const db = await getDb();
  const user = await db.collection<UserDocument>("users").findOne({
    eventId: new ObjectId(eventId),
    normalizedEmail,
  });
  return user ? serializeUser(user) : null;
}

export async function getUserById(userId: string) {
  const db = await getDb();
  const user = await db
    .collection<UserDocument>("users")
    .findOne({ _id: new ObjectId(userId) });
  return user ? serializeUser(user) : null;
}
