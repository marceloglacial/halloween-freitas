import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  isAdmin: vi.fn(),
  getDb: vi.fn(),
  getMongoClient: vi.fn(),
  getEventById: vi.fn(),
  removePartyPhoto: vi.fn(),
  retryPartyPhotoCleanup: vi.fn(),
  deletePartyPhotoAsset: vi.fn(),
  logServerError: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({ auth: mocks.auth }));
vi.mock("@/lib/auth/admin", () => ({ isAdmin: mocks.isAdmin }));
vi.mock("@/lib/db", () => ({
  getDb: mocks.getDb,
  getMongoClient: mocks.getMongoClient,
}));
vi.mock("@/lib/events", () => ({ getEventById: mocks.getEventById }));
vi.mock("@/lib/http", () => ({ logServerError: mocks.logServerError }));
vi.mock("@/lib/party-photos", () => ({
  deletePartyPhotoAsset: mocks.deletePartyPhotoAsset,
}));
vi.mock("@/lib/party-photo-writes", () => ({
  PartyAlbumWriteError: class PartyAlbumWriteError extends Error {
    constructor(
      public status: number,
      message: string,
    ) {
      super(message);
    }
  },
  removePartyPhoto: mocks.removePartyPhoto,
  retryPartyPhotoCleanup: mocks.retryPartyPhotoCleanup,
}));

import { DELETE } from "@/app/api/admin/events/[id]/party-photos/[photoId]/route";

const eventId = "507f1f77bcf86cd799439011";
const photoId = "507f1f77bcf86cd799439012";

function context(id = eventId, targetPhotoId = photoId) {
  return { params: Promise.resolve({ id, photoId: targetPhotoId }) };
}

describe("admin party photo removal API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ userId: "admin-user" });
    mocks.isAdmin.mockResolvedValue(true);
    mocks.getDb.mockResolvedValue({});
    mocks.getMongoClient.mockResolvedValue({});
    mocks.getEventById.mockResolvedValue({ _id: eventId });
    mocks.removePartyPhoto.mockResolvedValue({});
    mocks.retryPartyPhotoCleanup.mockResolvedValue(undefined);
  });

  it("denies guests before looking up an event or photo", async () => {
    mocks.isAdmin.mockResolvedValue(false);

    const response = await DELETE(new Request("http://localhost"), context());

    expect(response.status).toBe(401);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(mocks.getEventById).not.toHaveBeenCalled();
    expect(mocks.removePartyPhoto).not.toHaveBeenCalled();
  });

  it("validates both ids before touching persistence", async () => {
    const response = await DELETE(
      new Request("http://localhost"),
      context("not-an-event"),
    );

    expect(response.status).toBe(400);
    expect(mocks.removePartyPhoto).not.toHaveBeenCalled();
  });

  it("removes within the selected edition and attempts queued asset cleanup", async () => {
    const response = await DELETE(new Request("http://localhost"), context());

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await response.json()).toEqual({ removed: true });
    expect(mocks.removePartyPhoto).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        eventId: expect.objectContaining({ _bsontype: "ObjectId" }),
        photoId: expect.objectContaining({ _bsontype: "ObjectId" }),
        actorId: "admin-user",
        now: expect.any(Date),
      }),
    );
    expect(mocks.retryPartyPhotoCleanup).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ _bsontype: "ObjectId" }),
      mocks.deletePartyPhotoAsset,
    );
  });

  it("keeps removal successful and logged if Cloudinary cleanup cannot run", async () => {
    mocks.retryPartyPhotoCleanup.mockRejectedValue(new Error("offline"));

    const response = await DELETE(new Request("http://localhost"), context());

    expect(response.status).toBe(200);
    expect(mocks.logServerError).toHaveBeenCalledWith(
      "Admin party photo cleanup retry failed",
      expect.any(Error),
    );
  });
});
