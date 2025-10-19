"use server";

import { cookies } from "next/headers";

export async function setUserCookie(user: { _id: string; fullName: string }) {
  const cookieStore = await cookies();
  cookieStore.set("user", JSON.stringify(user), {
    path: "/",
    // You can add more options like secure, httpOnly, etc.
  });
}
