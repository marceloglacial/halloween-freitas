import { auth, currentUser } from "@clerk/nextjs/server";
import { MongoServerError, ObjectId } from "mongodb";
import { getDb } from "@/lib/db";
import { normalizeEmail } from "@/lib/http";
import type { UserDocument } from "@/lib/users";

export class GuestAccessError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

async function verifiedIdentity() {
  const { userId } = await auth();
  if (!userId)
    throw new GuestAccessError(401, "signed_out", "Entre para continuar.");
  const user = await currentUser();
  if (!user || user.id !== userId)
    throw new GuestAccessError(
      401,
      "signed_out",
      "Entre novamente para continuar.",
    );
  if (
    !user.emailAddresses.some(
      (email) => email.verification?.status === "verified",
    )
  ) {
    throw new GuestAccessError(
      403,
      "unverified",
      "Verifique seu email para continuar.",
    );
  }
  return user;
}

function guestIdentity(user: UserDocument) {
  if (user.status === "cancelled")
    throw new GuestAccessError(
      403,
      "cancelled",
      "Sua confirmação está cancelada. Entre em contato com o anfitrião.",
    );
  return {
    userId: user._id.toString(),
    eventId: user.eventId.toString(),
    fullName: user.fullName,
  };
}

async function linkedRegistration(eventId: string, clerkUserId: string) {
  const users = (await getDb()).collection<UserDocument>("users");
  const linked = await users
    .find({ eventId: new ObjectId(eventId), clerkUserId })
    .limit(2)
    .toArray();
  if (linked.length > 1)
    throw new GuestAccessError(
      409,
      "conflict",
      "Peça ao anfitrião para revisar seu vínculo de acesso.",
    );
  return linked[0] ?? null;
}

export async function getGuestRegistration(eventId: string) {
  const identity = await verifiedIdentity();
  const linked = await linkedRegistration(eventId, identity.id);
  if (linked) return guestIdentity(linked);
  throw new GuestAccessError(
    403,
    "unlinked",
    "Verifique seu acesso para continuar.",
  );
}

export async function claimGuestRegistration(eventId: string) {
  const identity = await verifiedIdentity();
  const linked = await linkedRegistration(eventId, identity.id);
  if (linked) return guestIdentity(linked);
  const verifiedEmails = identity.emailAddresses
    .filter((email) => email.verification?.status === "verified")
    .map((email) => normalizeEmail(email.emailAddress))
    .filter((email): email is string => Boolean(email));
  const users = (await getDb()).collection<UserDocument>("users");
  const matches = await users
    .find({
      eventId: new ObjectId(eventId),
      normalizedEmail: { $in: verifiedEmails },
    })
    .limit(2)
    .toArray();
  if (!matches.length)
    throw new GuestAccessError(
      404,
      "not_registered",
      "Use o email da sua confirmação. Não encontramos uma confirmação para esta conta neste evento.",
    );
  if (
    matches.length !== 1 ||
    (matches[0].clerkUserId && matches[0].clerkUserId !== identity.id)
  ) {
    throw new GuestAccessError(
      409,
      "conflict",
      "Peça ao anfitrião para revisar seu vínculo de acesso.",
    );
  }
  const registration = matches[0];
  guestIdentity(registration);
  try {
    await users.updateOne(
      {
        _id: registration._id,
        eventId: new ObjectId(eventId),
        normalizedEmail: registration.normalizedEmail,
        clerkUserId: { $exists: false },
        status: { $ne: "cancelled" },
      },
      { $set: { clerkUserId: identity.id } },
    );
  } catch (error) {
    if (!(error instanceof MongoServerError && error.code === 11000))
      throw error;
    // A simultaneous claim may have linked this identity. Re-read ownership.
  }
  const claimed = await linkedRegistration(eventId, identity.id);
  if (!claimed || !claimed._id.equals(registration._id))
    throw new GuestAccessError(
      409,
      "conflict",
      "O vínculo mudou. Peça ao anfitrião para revisar seu acesso.",
    );
  return guestIdentity(claimed);
}
