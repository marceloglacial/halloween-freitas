import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getEvents: vi.fn(),
  getCurrentEvent: vi.fn(),
  getEntries: vi.fn(),
}));

vi.mock("@/lib/events", () => ({
  getEvents: mocks.getEvents,
  getCurrentEvent: mocks.getCurrentEvent,
}));
vi.mock("@/lib/contestant-gallery", () => ({
  getPublicContestGalleryEntries: mocks.getEntries,
}));

import PhotosPage from "@/app/fotos/page";

const currentEvent: HalloweenEvent = {
  _id: "507f1f77bcf86cd799439011",
  year: 2026,
  slug: "halloween-2026",
  title: "Halloween 2026",
  timezone: "America/Toronto",
  registrationStartsAt: "2026-09-01T00:00:00.000Z",
  eventStartsAt: "2026-10-31T22:00:00.000Z",
  status: "active",
  votingStatus: "not_started",
  resultsPublished: false,
};

describe("contest photo gallery page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getEvents.mockResolvedValue([currentEvent]);
    mocks.getCurrentEvent.mockResolvedValue(currentEvent);
    mocks.getEntries.mockResolvedValue([]);
  });

  it("loads only the selected edition and uses the app photo endpoint", async () => {
    mocks.getEntries.mockResolvedValue([
      {
        _id: "507f1f77bcf86cd799439012",
        displayName: "Ana Freitas",
        entryType: "individual",
        categoryTitle: "Fantasia",
        width: 600,
        height: 800,
      },
    ]);
    const page = await PhotosPage({
      searchParams: Promise.resolve({ event: "halloween-2026" }),
    });
    const html = renderToStaticMarkup(page);

    expect(mocks.getEntries).toHaveBeenCalledWith(currentEvent._id);
    expect(html).toContain(
      "/api/contest-gallery/507f1f77bcf86cd799439012/photo?event=halloween-2026",
    );
    expect(html).toContain("Ana Freitas");
    expect(html).not.toContain("cloudinary");
  });

  it("does not silently fall back to the current edition for an invalid slug", async () => {
    const page = await PhotosPage({
      searchParams: Promise.resolve({ event: "missing-edition" }),
    });
    const html = renderToStaticMarkup(page);

    expect(html).toContain("Edição não encontrada");
    expect(mocks.getEntries).not.toHaveBeenCalled();
  });
});
