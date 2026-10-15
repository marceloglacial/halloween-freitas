import { auth } from "@clerk/nextjs/server";
import { isAdmin } from "@/lib/auth/admin";

export async function authorizeAdminPage(returnBackUrl = "/dashboard") {
  const { userId, redirectToSignIn } = await auth();
  if (!userId) redirectToSignIn({ returnBackUrl });
  return isAdmin(userId);
}
