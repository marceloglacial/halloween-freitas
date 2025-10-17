import React from "react";
import { CldImage } from "next-cloudinary";

export function UserListItem({
  user,
  openEditModal,
  handleDelete,
}: UserListItemProps) {
  return (
    <li
      key={user._id}
      className="flex items-center gap-4 rounded-lg bg-white/10 p-4"
    >
      <CldImage
        src={user.imageUrl || "halloween-freitas/apple-icon_fqkaye"}
        width={900}
        height={600}
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
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
  );
}
