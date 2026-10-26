import Link from "next/link";

export function UserListItem({ user, year }: UserListItemProps) {
  return (
    <li className="rounded-lg bg-white/10">
      <Link
        href={`/dashboard/convidados/${user._id}?year=${year}`}
        className="flex items-center justify-between gap-3 rounded-lg p-4 transition hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300"
        aria-label={`Gerenciar ${user.fullName}, ${user.email}`}
      >
        <div className="min-w-0 flex-1">
          <div className="min-w-0 truncate font-semibold">{user.fullName}</div>
          <div className="truncate text-sm text-gray-400">{user.email}</div>
        </div>
        <span aria-hidden="true" className="shrink-0 text-sm text-orange-200">
          Gerenciar →
        </span>
      </Link>
    </li>
  );
}
