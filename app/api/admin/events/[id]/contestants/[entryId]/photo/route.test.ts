import { beforeEach, describe, expect, it, vi } from "vitest";
import { ObjectId } from "mongodb";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  isAdmin: vi.fn(),
  getDb: vi.fn(),
  getMongoClient: vi.fn(),
  getEventById: vi.fn(),
  uploadContestPhoto: vi.fn(),
  validateContestPhoto: vi.fn(),
  contestPhotoPreviewUrl: vi.fn(),
  enqueueContestPhotoCleanup: vi.fn(),
  retryContestPhotoCleanup: vi.fn(),
  saveContestPhotoForAdmin: vi.fn(),
  logServerError: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({ auth: mocks.auth }));
vi.mock("@/lib/auth/admin", () => ({ isAdmin: mocks.isAdmin }));
vi.mock("@/lib/db", () => ({
  getDb: mocks.getDb,
  getMongoClient: mocks.getMongoClient,
}));
vi.mock("@/lib/events", () => ({ getEventById: mocks.getEventById }));
vi.mock("@/lib/contestant-photos", () => ({
  ContestPhotoInputError: class ContestPhotoInputError extends Error {
    constructor(
      public status: number,
      message: string,
      public cleanupAsset?: { assetId: string; publicId: string },
    ) {
      super(message);
    }
  },
  contestPhotoPreviewUrl: mocks.contestPhotoPreviewUrl,
  MAX_CONTEST_PHOTO_BYTES: 8 * 1024 * 1024,
  uploadContestPhoto: mocks.uploadContestPhoto,
  validateContestPhoto: mocks.validateContestPhoto,
}));
vi.mock("@/lib/contestant-photo-cleanup", () => ({
  enqueueContestPhotoCleanup: mocks.enqueueContestPhotoCleanup,
  retryContestPhotoCleanup: mocks.retryContestPhotoCleanup,
}));
vi.mock("@/lib/contestant-photo-writes", () => ({
  ContestPhotoWriteError: class ContestPhotoWriteError extends Error {
    constructor(
      public status: number,
      public code: string,
    ) {
      super(code);
    }
  },
  saveContestPhotoForAdmin: mocks.saveContestPhotoForAdmin,
}));
vi.mock("@/lib/http", () => ({
  errorResponse: (message: string, status: number) =>
    Response.json({ error: message }, { status }),
  logServerError: mocks.logServerError,
}));

import { PUT } from "@/app/api/admin/events/[id]/contestants/[entryId]/photo/route";

const eventId = "507f1f77bcf86cd799439011";
const entryId = "507f1f77bcf86cd799439012";
const consentAt = new Date("2026-09-10T00:00:00.000Z");
const asset = {
  assetId: "new-asset",
  publicId: "contest-photos/new",
  format: "png" as const,
  bytes: 1024,
  width: 800,
  height: 600,
  uploadedAt: new Date("2026-10-01T00:00:00.000Z"),
};

function uploadRequest() {
  const form = new FormData();
  form.set(
    "image",
    new File([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])], "photo.png", {
      type: "image/png",
    }),
  );
  return new Request("http://localhost", { method: "PUT", body: form });
}

describe("admin contestant photo correction route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.auth.mockResolvedValue({ userId: "admin-clerk-id" });
    mocks.isAdmin.mockResolvedValue(true);
    mocks.getEventById.mockResolvedValue({ _id: eventId });
    mocks.getDb.mockResolvedValue({
      collection: () => ({
        findOne: vi.fn().mockResolvedValue({
          _id: new ObjectId(entryId),
          ownerRsvpId: new ObjectId("507f1f77bcf86cd799439013"),
          contestPhoto: {
            assetId: "old-asset",
            publicId: "contest-photos/old",
            consentAt,
            consentByRsvpId: "507f1f77bcf86cd799439013",
          },
        }),
      }),
    });
    mocks.getMongoClient.mockResolvedValue({ startSession: vi.fn() });
    mocks.validateContestPhoto.mockReturnValue("png");
    mocks.uploadContestPhoto.mockResolvedValue(asset);
    mocks.contestPhotoPreviewUrl.mockReturnValue("temporary-preview");
    mocks.saveContestPhotoForAdmin.mockResolvedValue(undefined);
    mocks.retryContestPhotoCleanup.mockResolvedValue(undefined);
  });

  it("requires an authenticated administrator", async () => {
    mocks.isAdmin.mockResolvedValue(false);
    const response = await PUT(uploadRequest(), {
      params: Promise.resolve({ id: eventId, entryId }),
    });
    expect(response.status).toBe(401);
    expect(mocks.getDb).not.toHaveBeenCalled();
  });

  it("only replaces an existing consented contestant photo and records the admin", async () => {
    const response = await PUT(uploadRequest(), {
      params: Promise.resolve({ id: eventId, entryId }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      photoUrl: "temporary-preview",
    });
    expect(mocks.saveContestPhotoForAdmin).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        eventId: new ObjectId(eventId),
        entryId: new ObjectId(entryId),
        actorId: "admin-clerk-id",
        photo: expect.objectContaining({
          assetId: "new-asset",
          consentAt,
          consentByRsvpId: "507f1f77bcf86cd799439013",
        }),
      }),
    );
  });

  it("does not upload when the existing photo lacks recorded consent", async () => {
    mocks.getDb.mockResolvedValue({
      collection: () => ({
        findOne: vi.fn().mockResolvedValue({
          _id: new ObjectId(entryId),
          contestPhoto: { assetId: "old-asset" },
        }),
      }),
    });

    const response = await PUT(uploadRequest(), {
      params: Promise.resolve({ id: eventId, entryId }),
    });
    expect(response.status).toBe(409);
    expect(mocks.uploadContestPhoto).not.toHaveBeenCalled();
  });
});
