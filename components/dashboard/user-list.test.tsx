import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const mocks = vi.hoisted(() => ({
  useUsers: vi.fn(),
  fetchUsers: vi.fn(),
}));

vi.mock("@/hooks/useUsers", () => ({ useUsers: mocks.useUsers }));
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
vi.mock("next-cloudinary", () => ({
  CldImage: ({ alt }: { alt: string }) => <span aria-label={alt} />,
}));
import UserList from "@/components/dashboard/user-list";

const event: HalloweenEvent = {
  _id: "507f1f77bcf86cd799439011",
  year: 2026,
  slug: "halloween-2026",
  title: "Halloween 2026",
  timezone: "America/Toronto",
  registrationStartsAt: "2026-09-01T04:00:00.000Z",
  eventStartsAt: "2026-11-01T00:00:00.000Z",
  contestEntryStatus: "closed",
  votingStatus: "ended",
  resultsPublished: false,
  status: "active",
};

describe("admin guest management membership controls", () => {
  it("locks adding and deleting after voting while keeping edits available", () => {
    const user: AdminUser = {
      _id: "507f1f77bcf86cd799439012",
      eventId: event._id,
      fullName: "Ana Freitas",
      email: "ana@example.test",
    };
    mocks.useUsers.mockReturnValue({
      closeModal: vi.fn(),
      error: "",
      fetchUsers: mocks.fetchUsers,
      filteredUsers: [user],
      loading: false,
      search: "",
      setSearch: vi.fn(),
      users: [user],
    });

    const markup = renderToStaticMarkup(
      <UserList event={event} now="2026-11-01T01:00:00.000Z" />,
    );

    expect(markup).toContain("A primeira abertura da votação encerra");
    expect(markup).toContain(
      'aria-describedby="contestant-membership-lock-reason"',
    );
    expect(markup).toContain('href="/dashboard/convidados/novo?year=2026"');
    expect(markup).toContain('aria-disabled="true"');
    expect(markup).toContain(
      'href="/dashboard/convidados/507f1f77bcf86cd799439012?year=2026"',
    );
    expect(markup).not.toContain("user-edit-modal");
    expect(markup).toContain(
      "As correções de participantes existentes continuam disponíveis.",
    );
  });
});
