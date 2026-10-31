import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db";
import { getEventById } from "@/lib/events";
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

const COOKIE = "guest_session";
const SESSION_SECONDS = 60 * 60 * 24 * 30;
function sessionKey() {
  const key = process.env.GUEST_SESSION_SECRET || process.env.CLERK_SECRET_KEY;
  if (!key) throw new Error("Guest session secret is not configured");
  return key;
}
function sign(payload: string) {
  return createHmac("sha256", sessionKey()).update(payload).digest("base64url");
}
export function createGuestSession(userId: string, eventId: string) {
  const payload = Buffer.from(JSON.stringify({ userId, eventId, exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}
async function sessionIdentity(eventId: string) {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) throw new GuestAccessError(401, "signed_out", "Informe seu email para continuar.");
  const [payload, signature] = token.split(".");
  if (!payload || !signature) throw new GuestAccessError(401, "signed_out", "Acesse novamente para continuar.");
  const expected = Buffer.from(sign(payload));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) throw new GuestAccessError(401, "signed_out", "Acesse novamente para continuar.");
  try {
    const value = JSON.parse(Buffer.from(payload, "base64url").toString()) as { userId: string; eventId: string; exp: number };
    if (value.eventId !== eventId || value.exp <= Date.now() / 1000 || !ObjectId.isValid(value.userId)) throw new Error();
    return value.userId;
  } catch { throw new GuestAccessError(401, "signed_out", "Acesse novamente para continuar."); }
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

export async function getGuestRegistration(eventId: string) {
  const userId = await sessionIdentity(eventId);
  const users = (await getDb()).collection<UserDocument>("users");
  const linked = await users.findOne({ _id: new ObjectId(userId), eventId: new ObjectId(eventId) });
  if (linked) return guestIdentity(linked);
  throw new GuestAccessError(
    403,
    "unlinked",
    "Verifique seu acesso para continuar.",
  );
}

export async function updateGuestRegistrationName(
  eventId: string,
  fullName: string,
) {
  const identity = await sessionIdentity(eventId);
  const registration = await (await getDb()).collection<UserDocument>("users").findOne({ _id: new ObjectId(identity), eventId: new ObjectId(eventId) });
  if (!registration)
    throw new GuestAccessError(
      403,
      "unlinked",
      "Verifique seu acesso para continuar.",
    );
  guestIdentity(registration);

  const event = await getEventById(eventId);
  if (!event)
    throw new GuestAccessError(
      404,
      "event_not_found",
      "Evento não encontrado.",
    );

  const contestantFrozen =
    event.status === "archived" ||
    event.contestEntryStatus === "closed" ||
    event.votingStatus !== "not_started";
  const update: Record<string, string | Date> = {
    fullName,
    updatedAt: new Date(),
  };
  if (registration.contestant) {
    update.contestantName = contestantFrozen
      ? (registration.contestantName ?? registration.fullName)
      : fullName;
  }

  const users = (await getDb()).collection<UserDocument>("users");
  const result = await users.updateOne(
    {
      _id: registration._id,
      eventId: new ObjectId(eventId),
      status: { $ne: "cancelled" },
    },
    { $set: update },
  );
  if (!result.matchedCount)
    throw new GuestAccessError(
      409,
      "conflict",
      "Seu vínculo mudou. Atualize a página e tente novamente.",
    );

  return { ...guestIdentity(registration), fullName };
}

