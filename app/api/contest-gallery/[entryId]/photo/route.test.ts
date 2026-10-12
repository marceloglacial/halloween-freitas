import { ObjectId } from "mongodb";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  getEventBySlug: vi.fn(),
  getPhoto: vi.fn(),
  previewUrl: vi.fn(),
  logServerError: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ getDb: mocks.getDb }));
vi.mock("@/lib/events", () => ({ getEventBySlug: mocks.getEventBySlug }));
vi.mock("@/lib/contestant-gallery", () => ({
  getPublicContestGalleryPhoto: mocks.getPhoto,
}));
vi.mock("@/lib/contestant-photos", () => ({
  contestPhotoPreviewUrl: mocks.previewUrl,
}));
vi.mock("@/lib/http", () => ({ logServerError: mocks.logServerError }));

import { GET } from "@/app/api/contest-gallery/[entryId]/photo/route";

const eventId = new ObjectId("507f1f77bcf86cd799439011");
const entryId = "507f1f77bcf86cd799439012";
const event = { _id: eventId.toString(), slug: "halloween-2026" };
const db = {};

function request(slug = event.slug) {
  return new Request(
    `http://localhost/api/contest-gallery/${entryId}/photo?event=${slug}`,
  );
}

describe("public contestant photo delivery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getDb.mockResolvedValue(db);
    mocks.getEventBySlug.mockResolvedValue(event);
    mocks.getPhoto.mockResolvedValue({
      publicId: "private-cloudinary-id",
      format: "webp",
    });
    mocks.previewUrl.mockReturnValue("https://cloudinary.test/private-photo");
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(new Uint8Array([1, 2, 3]), {
            headers: { "Content-Type": "image/webp" },
          }),
      ),
    );
  });

  it("streams eligible photos without caching or exposing Cloudinary IDs", async () => {
    const response = await GET(request(), {
      params: Promise.resolve({ entryId }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/webp");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(mocks.getPhoto).toHaveBeenCalledWith(
      db,
      eventId,
      new ObjectId(entryId),
    );
    expect(mocks.previewUrl).toHaveBeenCalledWith(
      "private-cloudinary-id",
      "webp",
    );
  });

  it("hides invalid, missing, or no longer eligible photos", async () => {
    const invalid = await GET(request(), {
      params: Promise.resolve({ entryId: "invalid" }),
    });
    expect(invalid.status).toBe(404);
    expect(mocks.getEventBySlug).not.toHaveBeenCalled();

    mocks.getPhoto.mockResolvedValueOnce(null);
    const missing = await GET(request(), {
      params: Promise.resolve({ entryId }),
    });
    expect(missing.status).toBe(404);
    expect(await missing.text()).not.toContain("private-cloudinary-id");
  });
});
