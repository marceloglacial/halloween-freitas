"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import { SignOutButton } from "@clerk/nextjs";

export default function UserList() {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUsers() {
      setLoading(true);
      try {
        const res = await fetch("/api/dashboard/users");
        if (!res.ok) throw new Error("Failed to fetch users");
        const data = await res.json();
        setUsers(data);
      } catch {
        setUsers([]);
      } finally {
        setLoading(false);
      }
    }
    fetchUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      [u.fullName, u.email]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(q)),
    );
  }, [search, users]);

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">All Users</h1>
        <SignOutButton redirectUrl="/">
          <button className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700">
            Logout
          </button>
        </SignOutButton>
      </div>
      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search users by name or email..."
          className="w-full rounded-lg border border-gray-300 bg-white/20 px-4 py-2 text-white placeholder:text-white focus:ring-2 focus:ring-orange-400 focus:outline-none"
        />
      </div>
      <ul className="space-y-4">
        {loading ? (
          <li className="text-center text-gray-400">Loading users...</li>
        ) : filteredUsers.length === 0 ? (
          <li className="text-center text-gray-400">No users found.</li>
        ) : (
          filteredUsers.map((user) => (
            <li
              key={user._id}
              className="flex items-center gap-4 rounded-lg bg-white/10 p-4"
            >
              <Image
                src={user.imageUrl ?? "/apple-icon.png"}
                alt={user.fullName || "User"}
                width={40}
                height={40}
                className="h-10 w-10 rounded-full"
              />
              <div>
                <div className="font-semibold">{user.fullName}</div>
                <div className="text-sm text-gray-400">{user.email}</div>
              </div>
            </li>
          ))
        )}
      </ul>
    </>
  );
}
