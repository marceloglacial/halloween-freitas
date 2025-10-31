import UserList from "@/components/dashboard/user-list";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard - Halloween dos Freitas",
};

export default async function DashboardPage() {
  return (
    <main className="mx-auto max-w-2xl px-8 py-12">
      <UserList />
    </main>
  );
}
