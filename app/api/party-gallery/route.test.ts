import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  getEventBySlug: vi.fn(),
  getPublicPartyAlbum: vi.fn(),
  serializePublicPartyGalleryPhoto: vi.fn(),
  logServerError: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ getDb: mocks.getDb }));
vi.mock("@/lib/events", () => ({ getEventBySlug: mocks.getEventBySlug }));
vi.mock("@/lib/http", () => ({ logServerError: mocks.logServerError }));
vi.mock("@/lib/party-photo-writes", () => ({
  getPublicPartyAlbum: mocks.getPublicPartyAlbum,
  serializePublicPartyGalleryPhoto: mocks.serializePublicPartyGalleryPhoto,
}));

import { GET } from "@/app/api/party-gallery/route";

const eventId = "507f1f77bcf86cd799439011";
const event: HalloweenEvent = {
  _id: eventId,
  year: 2026,
  slug: "halloween-2026",
  title: "Halloween dos Freitas",
  timezone: "America/Toronto",
  registrationStartsAt: "2026-09-01T00:00:00.000Z",
  eventStartsAt: "2026-10-31T20:00:00.000Z",
  status: "active",
  contestEntryStatus: "closed",
  votingStatus: "ended",
  resultsPublished: false,
};

function request(slug = event.slug) {
  return new Request(
    `http://localhost/api/party-gallery?event=${encodeURIComponent(slug)}`,
  );
}

describe("public party gallery API", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.getDb.mockResolvedValue({});
    mocks.getEventBySlug.mockResolvedValue(event);
    mocks.getPublicPartyAlbum.mockResolvedValue({
      published: false,
      photos: [],
    });
    mocks.serializePublicPartyGalleryPhoto.mockImplementation(
      (photo, slug) => ({
        photoId: photo._id.toString(),
        previewUrl: `/api/party-gallery/${photo._id.toString()}?event=${slug}`,
        width: photo.width,
        height: photo.height,
      }),
    );
  });

  it("validates the event slug before querying event data", async () => {
    const response = await GET(request("invalid/slug"));

    expect(response.status).toBe(400);
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(mocks.getEventBySlug).not.toHaveBeenCalled();
  });

  it("returns no photo data or cacheable response while unpublished", async () => {
    const response = await GET(request());

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(response.headers.get("CDN-Cache-Control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      published: false,
      photos: [],
    });
    expect(mocks.getPublicPartyAlbum).toHaveBeenCalled();
    expect(mocks.serializePublicPartyGalleryPhoto).not.toHaveBeenCalled();
  });

  it("returns only short-lived image URLs and dimensions for a published album", async () => {
    mocks.getPublicPartyAlbum.mockResolvedValue({
      published: true,
      photos: [
        {
          _id: { toString: () => "507f1f77bcf86cd799439012" },
          publicId: "private-cloudinary-id",
          assetId: "private-cloudinary-asset",
          uploaderRsvpId: { toString: () => "private-rsvp-id" },
          format: "webp",
          width: 1600,
          height: 1200,
        },
      ],
    });

    const response = await GET(request());
    const body = await response.json();

    expect(body).toEqual({
      published: true,
      photos: [
        {
          photoId: "507f1f77bcf86cd799439012",
          previewUrl:
            "/api/party-gallery/507f1f77bcf86cd799439012?event=halloween-2026",
          width: 1600,
          height: 1200,
        },
      ],
    });
    expect(JSON.stringify(body)).not.toContain("private-cloudinary-id");
    expect(JSON.stringify(body)).not.toContain("private-cloudinary-asset");
    expect(JSON.stringify(body)).not.toContain("private-rsvp-id");
  });

  it("does not distinguish a missing edition through gallery data", async () => {
    mocks.getEventBySlug.mockResolvedValue(null);

    const response = await GET(request());

    expect(response.status).toBe(404);
    expect(mocks.getPublicPartyAlbum).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      error: "Edição não encontrada.",
    });
  });
});
