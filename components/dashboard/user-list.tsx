"use client";

import React, { useEffect } from "react";
import { UserListHeader } from "./user-list-header";
import { UserListItem } from "./user-list-item";
import { UserEditModal } from "./user-edit-modal";
import { useUsers } from "@/hooks/useUsers";
import { UserListSearch } from "./user-list-search";

export default function UserList() {
  const {
    closeModal,
    error,
    fetchUsers,
    filteredUsers,
    handleDelete,
    handleEdit,
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
      <UserListHeader users={users} />
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
        closeModal={closeModal}
        loading={loading}
        error={error}
      />
    </div>
  );
}
