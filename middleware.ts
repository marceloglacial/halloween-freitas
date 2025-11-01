import {
  clerkClient,
  clerkMiddleware,
  createRouteMatcher,
} from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher(["/dashboard(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
    const { userId } = await auth();
    if (!userId) {
      const url = req.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
    const client = await clerkClient();

    const currentUser = await client.users.getUser(userId);
    const role = currentUser?.publicMetadata?.role;

    if (role !== "admin") {
      const url = req.nextUrl.clone();
      url.pathname = "/logout";
      return NextResponse.redirect(url);
    }
  }
});
