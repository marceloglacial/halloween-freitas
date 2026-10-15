import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactElement } from "react";
import type EventLifecycle from "@/components/home/event-lifecycle";

const mocks = vi.hoisted(() => ({
  getActiveEvent: vi.fn(),
  getRegistrationState: vi.fn(),
  getCategories: vi.fn(),
}));

vi.mock("@/lib/events", () => ({
  getActiveEvent: mocks.getActiveEvent,
  getRegistrationState: mocks.getRegistrationState,
}));
vi.mock("@/util/get-categories", () => ({
  getCategories: mocks.getCategories,
}));
vi.mock("@/util/fonts", () => ({
  defaultFont: { className: "" },
  secondaryFont: { className: "" },
}));

import Home from "@/app/page";

const activeEvent: HalloweenEvent = {
  _id: "event-1",
  year: 2026,
  slug: "halloween-2026",
  title: "Halloween 2026",
  timezone: "America/Toronto",
  registrationStartsAt: "2026-09-01T04:00:00.000Z",
  eventStartsAt: "2026-11-01T00:00:00.000Z",
  votingStatus: "not_started",
  resultsPublished: false,
  status: "active",
};

function lifecycleProps(
  page: ReactElement<{
    children: ReactElement<React.ComponentProps<typeof EventLifecycle>>;
  }>,
) {
  return (
    page.props.children as ReactElement<
      React.ComponentProps<typeof EventLifecycle>
    >
  ).props;
}

describe("homepage category loading", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.getRegistrationState.mockReturnValue("upcoming");
  });

  it("loads categories only for the active event", async () => {
    const categories: Category[] = [
      {
        _id: "category-1",
        eventId: activeEvent._id,
        title: "Melhor Fantasia",
        icon: "🏆",
        order: 0,
        eligibility: "all",
      },
    ];
    mocks.getActiveEvent.mockResolvedValue(activeEvent);
    mocks.getCategories.mockResolvedValue(categories);
    mocks.getRegistrationState.mockReturnValue("upcoming");

    const page = await Home();

    expect(mocks.getCategories).toHaveBeenCalledWith(activeEvent._id);
    expect(lifecycleProps(page).initialCategories).toEqual(categories);
  });

  it("uses freshly loaded category changes when the homepage is refreshed", async () => {
    const first: Category[] = [
      {
        _id: "category-1",
        eventId: activeEvent._id,
        title: "Nome anterior",
        icon: "🏆",
        order: 0,
        eligibility: "all",
      },
    ];
    const updated: Category[] = [
      {
        _id: "category-2",
        eventId: activeEvent._id,
        title: "Nome atualizado",
        icon: "🦇",
        order: 0,
        eligibility: "all",
      },
    ];
    mocks.getActiveEvent.mockResolvedValue(activeEvent);
    mocks.getCategories
      .mockResolvedValueOnce(first)
      .mockResolvedValueOnce(updated);
    mocks.getRegistrationState.mockReturnValue("upcoming");

    const firstPage = await Home();
    const refreshedPage = await Home();

    expect(lifecycleProps(firstPage).initialCategories).toEqual(first);
    expect(lifecycleProps(refreshedPage).initialCategories).toEqual(updated);
  });

  it("does not read or pass categories when no event is active", async () => {
    mocks.getActiveEvent.mockResolvedValue(null);

    const page = await Home();

    expect(mocks.getCategories).not.toHaveBeenCalled();
    expect(lifecycleProps(page).initialCategories).toEqual([]);
  });
});
