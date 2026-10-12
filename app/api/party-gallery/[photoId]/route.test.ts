import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  getEventBySlug: vi.fn(),
  getPublicPartyPhoto: vi.fn(),
  partyPhotoPreviewUrl: vi.fn(),
  logServerError: vi.fn(),
  fetch: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ getDb: mocks.getDb }));
vi.mock("@/lib/events", () => ({ getEventBySlug: mocks.getEventBySlug }));
vi.mock("@/lib/http", () => ({ logServerError: mocks.logServerError }));
vi.mock("@/lib/party-photo-writes", () => ({
  getPublicPartyPhoto: mocks.getPublicPartyPhoto,
}));
vi.mock("@/lib/party-photos", () => ({
  partyPhotoPreviewUrl: mocks.partyPhotoPreviewUrl,
}));

import { GET } from "@/app/api/party-gallery/[photoId]/route";

const eventId = "507f1f77bcf86cd799439011";
const photoId = "507f1f77bcf86cd799439012";
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

function request(id = photoId, slug = event.slug) {
  return new Request(
    `http://localhost/api/party-gallery/${id}?event=${encodeURIComponent(slug)}`,
  );
}

function context(id = photoId) {
  return { params: Promise.resolve({ photoId: id }) };
}

describe("public party gallery image delivery", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.getDb.mockResolvedValue({});
    mocks.getEventBySlug.mockResolvedValue(event);
    mocks.getPublicPartyPhoto.mockResolvedValue(null);
    mocks.partyPhotoPreviewUrl.mockReturnValue(
      "https://private-cloudinary-url",
    );
    mocks.fetch.mockResolvedValue(
      new Response(new Uint8Array([137, 80, 78, 71]), {
        headers: { "Content-Type": "image/png" },
      }),
    );
    vi.stubGlobal("fetch", mocks.fetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the same unavailable response for private and missing photos", async () => {
    const response = await GET(request(), context());

    expect(response.status).toBe(404);
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    await expect(response.json()).resolves.toEqual({
      error: "Esta foto não está disponível.",
    });
    expect(mocks.partyPhotoPreviewUrl).not.toHaveBeenCalled();
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("rejects invalid photo IDs without querying Cloudinary", async () => {
    const response = await GET(request("bad-id"), context("bad-id"));

    expect(response.status).toBe(404);
    expect(mocks.getPublicPartyPhoto).not.toHaveBeenCalled();
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("streams published image bytes without exposing the Cloudinary URL", async () => {
    mocks.getPublicPartyPhoto.mockResolvedValue({
      publicId: "private-cloudinary-id",
      format: "png",
    });

    const response = await GET(request(), context());

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/png");
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(mocks.partyPhotoPreviewUrl).toHaveBeenCalledWith(
      "private-cloudinary-id",
      "png",
    );
    expect(mocks.fetch).toHaveBeenCalledWith("https://private-cloudinary-url", {
      cache: "no-store",
    });
    expect(await response.arrayBuffer()).toEqual(
      new Uint8Array([137, 80, 78, 71]).buffer,
    );
  });
});
