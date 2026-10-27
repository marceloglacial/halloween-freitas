"use client";

import React, { useEffect } from "react";
import { UserListItem } from "./user-list-item";
import { useUsers } from "@/hooks/useUsers";
import { UserListSearch } from "./user-list-search";
import Link from "next/link";
import { getAdminEnrollmentControls } from "@/util/admin-enrollment-controls";

export default function UserList({
  event,
  now,
  participantsOnly = false,
}: {
  event: HalloweenEvent;
  now: string;
  participantsOnly?: boolean;
}) {
  const enrollmentControls = getAdminEnrollmentControls(event, new Date(now));
  const canChangeMembership = enrollmentControls.canChangeContestantMembership;
  const membershipHelpId = "contestant-membership-lock-reason";
  const {
    error,
    fetchUsers,
    filteredUsers,
    loading,
    search,
    setSearch,
    users,
  } = useUsers(event._id, participantsOnly);
  const participantCount =
    users.length +
    users.reduce((total, user) => total + (user.groupEntries?.length ?? 0), 0);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="min-w-0 truncate text-xl font-semibold sm:text-2xl">
          {participantsOnly
            ? `${participantCount} participantes com foto`
            : `${users.length} convidados`}
        </h2>
        <div className="flex shrink-0 gap-2">
          <Link
            href={`/dashboard/convidados/novo?year=${event.year}`}
            aria-disabled={!canChangeMembership || loading}
            tabIndex={!canChangeMembership || loading ? -1 : undefined}
            className={`shrink-0 rounded-lg bg-orange-400 px-2 py-2 text-sm whitespace-nowrap text-black transition hover:bg-orange-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-200 sm:px-4 sm:text-base ${!canChangeMembership || loading ? "pointer-events-none opacity-50" : ""}`}
          >
            Adicionar participante
          </Link>
        </div>
      </div>
      {participantsOnly && (
        <Link
          href={`/dashboard/convidados?year=${event.year}`}
          className="text-sm text-orange-200 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300"
        >
          Ver todos os convidados
        </Link>
      )}
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
            {participantsOnly
              ? "Nenhum participante com foto encontrado."
              : "Nenhum convidado encontrado."}
          </li>
        ) : (
          filteredUsers.flatMap((user: AdminUser) => [
            <UserListItem
              key={`guest-${user._id}`}
              user={user}
              year={event.year}
            />,
            ...(user.groupEntries ?? []).map((groupEntry, index) => (
              <UserListItem
                key={`group-${user._id}-${index}`}
                user={user}
                year={event.year}
                groupEntry={groupEntry}
              />
            )),
          ])
        )}
      </ul>
    </div>
  );
}
