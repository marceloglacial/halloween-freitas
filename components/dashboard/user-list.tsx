"use client";

import React, { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import { SignOutButton } from "@clerk/nextjs";
import { CldImage, CldUploadButton } from "next-cloudinary";

export default function UserList() {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  // For create/edit modal
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [modalUser, setModalUser] = useState<Partial<User>>({});

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/dashboard/users");
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      setUsers(data);
    } catch (err: unknown) {
      setUsers([]);
      setError(
        typeof err === "object" &&
          err &&
          "message" in err &&
          typeof (err as { message?: unknown }).message === "string"
          ? (err as { message: string }).message
          : "Error fetching users",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(user: Partial<User>) {
    setError("");
    try {
      setLoading(true);
      const res = await fetch("/api/dashboard/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(user),
      });
      if (!res.ok) throw new Error("Failed to create user");
      const newUser = await res.json();
      setUsers((prev: User[]) => [...prev, newUser]);
      setShowModal(false);
    } catch (err: unknown) {
      setError(
        typeof err === "object" &&
          err &&
          "message" in err &&
          typeof (err as { message?: unknown }).message === "string"
          ? (err as { message: string }).message
          : "Error creating user",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleEdit(user: Partial<User>) {
    setError("");
    try {
      setLoading(true);
      const res = await fetch("/api/dashboard/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(user),
      });
      if (!res.ok) throw new Error("Failed to update user");
      const updated = await res.json();
      setUsers((prev: User[]) =>
        prev.map((u: User) =>
          u._id === updated._id ? { ...u, ...updated } : u,
        ),
      );
      setShowModal(false);
    } catch (err: unknown) {
      setError(
        typeof err === "object" &&
          err &&
          "message" in err &&
          typeof (err as { message?: unknown }).message === "string"
          ? (err as { message: string }).message
          : "Error updating user",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(_id: string) {
    setError("");
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      const res = await fetch("/api/dashboard/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _id }),
      });
      if (!res.ok) throw new Error("Failed to delete user");
      setUsers((prev: User[]) => prev.filter((u: User) => u._id !== _id));
    } catch (err: unknown) {
      setError(
        typeof err === "object" &&
          err &&
          "message" in err &&
          typeof (err as { message?: unknown }).message === "string"
          ? (err as { message: string }).message
          : "Error deleting user",
      );
    }
  }

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u: User) =>
      [u.fullName, u.email]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(q)),
    );
  }, [search, users]);

  function openCreateModal() {
    setModalMode("create");
    setModalUser({});
    setShowModal(true);
  }

  function openEditModal(user: User) {
    setModalMode("edit");
    setModalUser(user);
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setModalUser({});
    setError("");
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">All Users</h1>
        <div className="flex gap-2">
          <button
            className="cursor-pointer rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700"
            onClick={openCreateModal}
          >
            Add User
          </button>
          <SignOutButton redirectUrl="/">
            <button className="cursor-pointer rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700">
              Logout
            </button>
          </SignOutButton>
        </div>
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
      {error && <div className="mb-2 text-red-500">{error}</div>}
      <ul className="space-y-4">
        {loading ? (
          <li className="text-center text-gray-400">Loading users...</li>
        ) : filteredUsers.length === 0 ? (
          <li className="text-center text-gray-400">No users found.</li>
        ) : (
          filteredUsers.map((user: User) => (
            <li
              key={user._id}
              className="flex items-center gap-4 rounded-lg bg-white/10 p-4"
            >
              <CldImage
                src={user.imageUrl || "halloween-freitas/apple-icon_fqkaye"}
                width={900}
                height={600}
                sizes="(max-width: 768px) 100vw,
                    (max-width: 1200px) 50vw,
                    33vw"
                alt="User Image"
                className="h-10 w-10 rounded-full"
              />
              <div className="flex-1">
                <div className="w-32 truncate font-semibold md:w-fit">
                  {user.fullName}
                </div>
                <div className="w-32 truncate text-sm text-gray-400 md:w-fit">
                  {user.email}
                </div>
              </div>
              <div className="flex lg:gap-2">
                <button
                  className="cursor-pointer rounded px-4 py-3 text-xs text-white hover:bg-blue-700"
                  onClick={() => openEditModal(user)}
                >
                  Edit
                </button>
                <button
                  className="cursor-pointer rounded px-4 py-2 text-xs text-white hover:bg-red-700"
                  onClick={() => handleDelete(user._id)}
                >
                  Delete
                </button>
              </div>
            </li>
          ))
        )}
      </ul>

      {/* Modal for create/edit user */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-md rounded-lg bg-gray-900 p-6 shadow-lg">
            <h2 className="mb-4 text-xl font-bold">
              {modalMode === "create" ? "Add User" : "Edit User"}
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (modalMode === "create") handleCreate(modalUser);
                else handleEdit(modalUser);
              }}
              className="space-y-4"
            >
              <input
                type="text"
                value={modalUser.fullName || ""}
                onChange={(e) =>
                  setModalUser((u) => ({ ...u, fullName: e.target.value }))
                }
                placeholder="Full Name"
                required
                disabled={loading}
                className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-white"
              />
              <input
                type="email"
                value={modalUser.email || ""}
                onChange={(e) =>
                  setModalUser((u) => ({ ...u, email: e.target.value }))
                }
                placeholder="Email"
                required
                disabled={loading}
                className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-white"
              />
              {modalUser.imageUrl ? (
                <CldImage
                  src={modalUser.imageUrl}
                  width={900}
                  height={600}
                  sizes="(max-width: 768px) 100vw,
                    (max-width: 1200px) 50vw,
                    33vw"
                  alt="User Image"
                  className="cursor-pointer overflow-hidden rounded"
                  onClick={() => {
                    setModalUser((u) => ({ ...u, imageUrl: "" }));
                  }}
                />
              ) : (
                <CldUploadButton
                  uploadPreset="halloween-freitas"
                  className="cursor-pointer rounded bg-blue-600 px-4 py-2 text-white hover:bg-orange-700"
                  onSuccess={(e) => {
                    setModalUser((u) => ({
                      ...u,
                      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                      // @ts-expect-error
                      imageUrl: e.info.public_id,
                    }));
                  }}
                >
                  Upload an image
                </CldUploadButton>
              )}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="cursor-pointer rounded bg-gray-700 px-4 py-2 text-white"
                  onClick={closeModal}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="cursor-pointer rounded bg-orange-600 px-4 py-2 text-white hover:bg-orange-700"
                  disabled={loading}
                >
                  {modalMode === "create"
                    ? `Creat${loading ? "ing" : "e"}`
                    : `Updat${loading ? "ing" : "e"}`}
                </button>
              </div>
            </form>
            {error && <div className="mt-2 text-red-500">{error}</div>}
          </div>
        </div>
      )}
    </>
  );
}
