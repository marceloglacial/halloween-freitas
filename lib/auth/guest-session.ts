import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { getSessionSecret } from "@/lib/env";

const COOKIE_NAME = "guest_session";
const SESSION_SECONDS = 60 * 60 * 12;

export type GuestSessionPayload = {
  userId: string;
  eventId: string;
  fullName: string;
  exp: number;
};

function encode(value: string) {
  return Buffer.from(value).toString("base64url");
}

function sign(encodedPayload: string) {
  return createHmac("sha256", getSessionSecret())
    .update(encodedPayload)
    .digest("base64url");
}

export function serializeGuestSession(payload: GuestSessionPayload) {
  const encodedPayload = encode(JSON.stringify(payload));
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

export function deserializeGuestSession(
  value: string,
): GuestSessionPayload | null {
  const [encodedPayload, signature] = value.split(".");
  if (!encodedPayload || !signature) return null;

  const expected = sign(encodedPayload);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString(),
    ) as GuestSessionPayload;
    if (
      !payload.userId ||
      !payload.eventId ||
      !payload.fullName ||
      payload.exp <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export async function createGuestSession(
  user: Pick<User, "_id" | "fullName" | "eventId">,
) {
  const expires = new Date(Date.now() + SESSION_SECONDS * 1000);
  const cookieStore = await cookies();
  cookieStore.set(
    COOKIE_NAME,
    serializeGuestSession({
      userId: user._id,
      eventId: user.eventId,
      fullName: user.fullName,
      exp: Math.floor(expires.getTime() / 1000),
    }),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires,
    },
  );
}

export async function getGuestSession() {
  const value = (await cookies()).get(COOKIE_NAME)?.value;
  return value ? deserializeGuestSession(value) : null;
}

export async function clearGuestSession() {
  (await cookies()).set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
