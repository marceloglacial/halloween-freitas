import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("@/components/dashboard/user-list", () => ({
  default: ({ event }: { event: HalloweenEvent }) => (
    <div data-event-id={event._id}>Lista de convidados existente</div>
  ),
}));

import AdminEventGuests from "@/components/dashboard/admin-event-guests";

const event: HalloweenEvent = {
  _id: "507f1f77bcf86cd799439011",
  year: 2025,
  slug: "halloween-2025",
  title: "Halloween dos Freitas 2025",
  timezone: "America/Toronto",
  registrationStartsAt: "2025-09-01T04:00:00.000Z",
  eventStartsAt: "2025-11-01T00:00:00.000Z",
  contestEntryStatus: "closed",
  votingStatus: "ended",
  resultsPublished: false,
  status: "archived",
};

describe("admin event guest route", () => {
  it("keeps historical guest management tied to the selected edition", () => {
    const html = renderToStaticMarkup(
      <AdminEventGuests event={event} now="2025-11-02T00:00:00.000Z" />,
    );
    expect(html).toContain("Convidados · edição 2025");
    expect(html).toContain("Edição arquivada");
    expect(html).toContain("novas inclusões e exclusões seguem bloqueadas");
    expect(html).toContain(`data-event-id="${event._id}"`);
  });
});
