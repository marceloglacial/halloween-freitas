import { auth } from "@clerk/nextjs/server";
import { clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { SignOutButton } from "@clerk/nextjs";
import UserList from "@/components/dashboard/user-list";

export type User = {
  _id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  imageUrl?: string;
};

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/");
  }

  const client = await clerkClient();
  const currentUser = await client.users.getUser(userId);
  const role = currentUser?.publicMetadata?.role;

  if (role !== "admin") {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center gap-6 p-8">
        <h2>Usuário não autorizado.</h2>
        <SignOutButton redirectUrl="/">
          <button className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700">
            Logout
          </button>
        </SignOutButton>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-8 py-12">
      <UserList />
    </main>
  );
}
