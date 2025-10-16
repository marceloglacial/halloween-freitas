import { auth } from "@clerk/nextjs/server";
import { clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Image from "next/image";
import { SignOutButton } from "@clerk/nextjs";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/");
  }

  // Fetch current user and check role
  const client = await clerkClient();
  const currentUser = await client.users.getUser(userId);
  const role = currentUser?.publicMetadata?.role;
  if (role !== "admin") {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center gap-6">
        <h2>Usuário não autorizado.</h2>
        <SignOutButton redirectUrl="/">
          <button className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700">
            Logout
          </button>
        </SignOutButton>
      </div>
    );
  }

  // Fetch all users
  const users = await client.users.getUserList();

  return (
    <main className="mx-auto max-w-2xl py-12">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">All Users</h1>
        <SignOutButton redirectUrl="/">
          <button className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700">
            Logout
          </button>
        </SignOutButton>
      </div>
      <ul className="space-y-4">
        {users.data?.map((user) => (
          <li
            key={user.id}
            className="flex items-center gap-4 rounded-lg bg-white/10 p-4"
          >
            <Image
              src={user.imageUrl ?? "/apple-icon.png"}
              alt={user.firstName || "User"}
              width={40}
              height={40}
              className="h-10 w-10 rounded-full"
            />
            <div>
              <div className="font-semibold">
                {user.firstName} {user.lastName}
              </div>
              <div className="text-sm text-gray-400">
                {user.emailAddresses[0]?.emailAddress}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
