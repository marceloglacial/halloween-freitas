import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db";

export type UserDocument = Omit<User, "_id" | "eventId"> & {
  _id: ObjectId;
  eventId: ObjectId;
  normalizedEmail: string;
  clerkUserId?: string;
  status?: "confirmed" | "cancelled";
};

export function serializeUser(user: UserDocument): User {
  return {
    _id: user._id.toString(),
    eventId: user.eventId.toString(),
    fullName: user.fullName,
    email: user.email,
    imageUrl: user.imageUrl,
    group: Boolean(user.group),
    junior: Boolean(user.junior),
    ...(user.status ? { status: user.status } : {}),
  };
}

export function toPublicUser(user: User): PublicUser {
  return {
    _id: user._id,
    eventId: user.eventId,
    fullName: user.fullName,
    imageUrl: user.imageUrl,
    group: user.group,
    junior: user.junior,
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
  return (await getUsersForEvent(eventId)).map(toPublicUser);
}

export async function getPublicVotingUsersForEvent(eventId: string) {
  return (await getUsersForEvent(eventId))
    .filter((user) => user.status !== "cancelled")
    .map(toPublicUser);
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
