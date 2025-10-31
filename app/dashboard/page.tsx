import UserList from "@/components/dashboard/user-list";

export type User = {
  _id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  imageUrl?: string;
};

export default async function DashboardPage() {
  return (
    <main className="mx-auto max-w-2xl px-8 py-12">
      <UserList />
    </main>
  );
}
