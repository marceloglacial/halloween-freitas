import React from "react";
import Link from "next/link";
import { SignOutButton } from "@clerk/nextjs";

export function UserListHeader() {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <h1 className="text-3xl font-bold">All Users</h1>
      <div className="flex gap-2">
        <Link
          href={"/votacao"}
          className="cursor-pointer rounded-lg bg-green-500 px-4 py-2 text-white hover:bg-green-500"
        >
          Votação
        </Link>
        <SignOutButton redirectUrl="/">
          <button className="cursor-pointer rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700">
            Logout
          </button>
        </SignOutButton>
      </div>
    </div>
  );
}
