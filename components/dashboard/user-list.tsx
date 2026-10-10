"use client";

import React, { useEffect } from "react";
import { UserListItem } from "./user-list-item";
import { UserEditModal } from "./user-edit-modal";
import { useUsers } from "@/hooks/useUsers";
import { UserListSearch } from "./user-list-search";
import Link from "next/link";
import { getAdminEnrollmentControls } from "@/util/admin-enrollment-controls";

export default function UserList({
  event,
  now,
}: {
  event: HalloweenEvent;
  now: string;
}) {
  const enrollmentControls = getAdminEnrollmentControls(event, new Date(now));
  const canChangeMembership = enrollmentControls.canChangeContestantMembership;
  const membershipHelpId = "contestant-membership-lock-reason";
  const {
    closeModal,
    error,
    fetchUsers,
    filteredUsers,
    handleDelete,
    handleEdit,
    handleCreate,
    handleResetAccess,
    loading,
    modalUser,
    openEditModal,
    search,
    setModalUser,
    setSearch,
    showModal,
    users,
  } = useUsers(event._id);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="text-3xl font-bold">{users.length} convidados</h1>
        <div className="flex flex-wrap justify-between gap-2">
          <button
            type="button"
            disabled={!canChangeMembership || loading}
            aria-describedby={
              !canChangeMembership ? membershipHelpId : undefined
            }
            className="self-end rounded-lg bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300 disabled:opacity-50"
            onClick={() => openEditModal(null)}
          >
            Adicionar participante
          </button>
          <Link
            href={`/resultados?event=${event.slug}`}
            className="cursor-pointer rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-400"
          >
            Resultados
          </Link>
        </div>
      </div>
      {!canChangeMembership && (
        <p
          id={membershipHelpId}
          role="status"
          className="rounded-lg border border-white/15 bg-white/5 p-3 text-sm text-gray-300"
        >
          {enrollmentControls.contestantMembershipDisabledReason} As correções
          de participantes existentes continuam disponíveis.
        </p>
      )}
      <UserListSearch search={search} setSearch={setSearch} />
      {error && (
        <div role="alert" className="mb-2 text-red-300">
          {error}
        </div>
      )}
      <ul className="space-y-4">
        {loading ? (
          <li role="status" className="text-center text-gray-400">
            Carregando convidados…
          </li>
        ) : filteredUsers.length === 0 ? (
          <li className="text-center text-gray-400">
            Nenhum convidado encontrado.
          </li>
        ) : (
          filteredUsers.map((user: AdminUser) => (
            <UserListItem
              key={user._id}
              user={user}
              openEditModal={openEditModal}
              handleDelete={handleDelete}
              canDelete={canChangeMembership && !loading}
              disabledDescriptionId={membershipHelpId}
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
        handleResetAccess={handleResetAccess}
        closeModal={closeModal}
        loading={loading}
        error={error}
      />
    </div>
  );
}
