import { auth, clerkClient } from "@clerk/nextjs/server";

export async function isAdmin(authenticatedUserId?: string | null) {
  const userId = authenticatedUserId ?? (await auth()).userId;
  if (!userId) return false;

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  return user.publicMetadata?.role === "admin";
}
