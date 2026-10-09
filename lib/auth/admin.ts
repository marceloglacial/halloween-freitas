import { auth, clerkClient } from "@clerk/nextjs/server";
import { logServerError } from "@/lib/http";

export async function isAdmin(authenticatedUserId?: string | null) {
  try {
    const userId = authenticatedUserId ?? (await auth()).userId;
    if (!userId) return false;

    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    return user.publicMetadata?.role === "admin";
  } catch (error) {
    logServerError("Admin authorization check failed", error);
    return false;
  }
}
