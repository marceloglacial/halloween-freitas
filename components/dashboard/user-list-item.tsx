import React from "react";

export function UserListItem({
  user,
  openEditModal,
  handleDelete,
  canDelete,
  disabledDescriptionId,
}: UserListItemProps) {
  return (
    <li
      key={user._id}
      className="flex flex-col gap-3 rounded-lg bg-white/10 p-4 sm:flex-row sm:items-center sm:gap-4"
    >
      <div className="min-w-0 flex-1">
        <div className="w-32 truncate font-semibold md:w-fit">
          {user.fullName}
        </div>
        <div className="w-32 truncate text-sm text-gray-400 md:w-fit">
          {user.email}
        </div>
      </div>
      <div className="flex flex-wrap gap-2 sm:justify-end">
        <button
          type="button"
          className="cursor-pointer rounded px-4 py-3 text-xs text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300"
          onClick={() => openEditModal(user)}
        >
          Editar
        </button>
        <button
          type="button"
          disabled={!canDelete}
          aria-describedby={!canDelete ? disabledDescriptionId : undefined}
          className="cursor-pointer rounded px-4 py-2 text-xs text-white hover:bg-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => handleDelete(user._id)}
        >
          Excluir
        </button>
      </div>
    </li>
  );
}
