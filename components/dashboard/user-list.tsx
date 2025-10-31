"use client";

import React, { useEffect } from "react";
import { UserListItem } from "./user-list-item";
import { UserEditModal } from "./user-edit-modal";
import { useUsers } from "@/hooks/useUsers";
import { UserListSearch } from "./user-list-search";
import Link from "next/link";
import { SignOutButton } from "@clerk/nextjs";

export default function UserList() {
  const {
    closeModal,
    error,
    fetchUsers,
    filteredUsers,
    handleDelete,
    handleEdit,
    handleCreate,
    loading,
    modalUser,
    openEditModal,
    search,
    setModalUser,
    setSearch,
    showModal,
    users,
  } = useUsers();

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="text-3xl font-bold">{users.length} convidados</h1>
        <div className="flex justify-between gap-2">
          <button
            className="self-end rounded-lg bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700"
            onClick={() => openEditModal(null)}
          >
            Criar Usuário
          </button>
          <Link
            href={"/resultados"}
            className="cursor-pointer rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-400"
          >
            Resultados
          </Link>
          <SignOutButton redirectUrl="/">
            <button className="cursor-pointer rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700">
              Logout
            </button>
          </SignOutButton>
        </div>
      </div>
      <UserListSearch search={search} setSearch={setSearch} />
      {error && <div className="mb-2 text-red-500">{error}</div>}
      <ul className="space-y-4">
        {loading ? (
          <li className="text-center text-gray-400">Loading users...</li>
        ) : filteredUsers.length === 0 ? (
          <li className="text-center text-gray-400">No users found.</li>
        ) : (
          filteredUsers.map((user: User) => (
            <UserListItem
              key={user._id}
              user={user}
              openEditModal={openEditModal}
              handleDelete={handleDelete}
            />
          ))
        )}
      </ul>
      <UserEditModal
        showModal={showModal}
        modalUser={modalUser}
        setModalUser={setModalUser}
        handleEdit={handleEdit}
        handleCreate={handleCreate}
        closeModal={closeModal}
        loading={loading}
        error={error}
      />
    </div>
  );
}
