import { beforeEach, describe, expect, it, vi } from "vitest";
import { ObjectId } from "mongodb";

const mocks = vi.hoisted(() => ({
  getGuestRegistration: vi.fn(),
  getDb: vi.fn(),
  getMongoClient: vi.fn(),
  getEventById: vi.fn(),
  uploadContestPhoto: vi.fn(),
  validateContestPhoto: vi.fn(),
  contestPhotoPreviewUrl: vi.fn(),
  enqueueContestPhotoCleanup: vi.fn(),
  retryContestPhotoCleanup: vi.fn(),
  getContestantEntryForPhoto: vi.fn(),
  saveContestPhotoForGuest: vi.fn(),
  logServerError: vi.fn(),
}));

vi.mock("@/lib/auth/guest-registration", () => {
  class GuestAccessError extends Error {
    constructor(
      public status: number,
      public code: string,
      message: string,
    ) {
      super(message);
    }
  }
  return { GuestAccessError, getGuestRegistration: mocks.getGuestRegistration };
});
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
  getContestantEntryForPhoto: mocks.getContestantEntryForPhoto,
  saveContestPhotoForGuest: mocks.saveContestPhotoForGuest,
}));
vi.mock("@/lib/http", () => ({
  errorResponse: (message: string, status: number) =>
    Response.json({ error: message }, { status }),
  logServerError: mocks.logServerError,
}));

import { GuestAccessError } from "@/lib/auth/guest-registration";
import { PUT } from "@/app/api/contestants/[id]/photo/route";

const event: HalloweenEvent = {
  _id: "507f1f77bcf86cd799439011",
  year: 2026,
  slug: "halloween-2026",
  title: "Halloween dos Freitas",
  timezone: "America/Toronto",
  registrationStartsAt: "2026-09-01T00:00:00.000Z",
  eventStartsAt: "2026-10-31T20:00:00.000Z",
  status: "active",
  contestEntryStatus: "open",
  votingStatus: "not_started",
  resultsPublished: false,
};

const eventId = event._id;
const entryId = "507f1f77bcf86cd799439012";
const rsvpId = "507f1f77bcf86cd799439013";
const asset = {
  assetId: "asset-1",
  publicId: "contest-photos/asset-1",
  format: "png" as const,
  bytes: 8,
  width: 1,
  height: 1,
  uploadedAt: new Date("2026-10-01T00:00:00.000Z"),
};

function uploadRequest(options?: {
  consent?: string;
  file?: File | null;
  eventId?: string;
}) {
  const form = new FormData();
  if (options?.file !== null) {
    form.set(
      "image",
      options?.file ??
        new File(
          [Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])],
          "photo.png",
          {
            type: "image/png",
          },
        ),
    );
  }
  if (options?.consent !== undefined) form.set("photoConsent", options.consent);
  return new Request(
    `http://localhost/api/contestants/${entryId}/photo?eventId=${options?.eventId ?? eventId}`,
    { method: "PUT", body: form },
  );
}

describe("contestant photo upload route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.getEventById.mockResolvedValue(event);
    mocks.getGuestRegistration.mockResolvedValue({
      userId: rsvpId,
      eventId,
      fullName: "Ana Freitas",
    });
    mocks.getDb.mockResolvedValue({ collection: vi.fn() });
    mocks.getMongoClient.mockResolvedValue({ startSession: vi.fn() });
    mocks.getContestantEntryForPhoto.mockResolvedValue({
      _id: new ObjectId(entryId),
      status: "draft",
    });
    mocks.validateContestPhoto.mockReturnValue("png");
    mocks.uploadContestPhoto.mockResolvedValue(asset);
    mocks.contestPhotoPreviewUrl.mockReturnValue(
      "https://private.example/temporary",
    );
    mocks.enqueueContestPhotoCleanup.mockResolvedValue(undefined);
    mocks.retryContestPhotoCleanup.mockResolvedValue(undefined);
    mocks.saveContestPhotoForGuest.mockResolvedValue(undefined);
  });

  it("rejects an invalid edition before authorizing or uploading", async () => {
    const response = await PUT(uploadRequest({ eventId: "bad" }), {
      params: Promise.resolve({ id: entryId }),
    });
    expect(response.status).toBe(400);
    expect(mocks.getGuestRegistration).not.toHaveBeenCalled();
  });

  it("denies guests without a verified linked RSVP", async () => {
    mocks.getGuestRegistration.mockRejectedValue(
      new GuestAccessError(403, "unlinked", "Verifique seu acesso."),
    );
    const response = await PUT(uploadRequest(), {
      params: Promise.resolve({ id: entryId }),
    });
    expect(response.status).toBe(403);
    expect(mocks.uploadContestPhoto).not.toHaveBeenCalled();
  });

  it("rejects a closed entry window without uploading", async () => {
    mocks.getEventById.mockResolvedValue({
      ...event,
      contestEntryStatus: "closed",
    });
    const response = await PUT(uploadRequest(), {
      params: Promise.resolve({ id: entryId }),
    });
    expect(response.status).toBe(409);
    expect(mocks.uploadContestPhoto).not.toHaveBeenCalled();
  });

  it("rejects entries outside the guest's event-scoped ownership", async () => {
    mocks.getContestantEntryForPhoto.mockResolvedValue(null);
    const response = await PUT(uploadRequest(), {
      params: Promise.resolve({ id: entryId }),
    });
    expect(response.status).toBe(404);
    expect(mocks.uploadContestPhoto).not.toHaveBeenCalled();
    expect(mocks.getContestantEntryForPhoto).toHaveBeenCalledWith(
      expect.anything(),
      new ObjectId(eventId),
      new ObjectId(entryId),
      new ObjectId(rsvpId),
    );
  });

  it("requires an uploaded image and explicit photo permission", async () => {
    const missingFile = await PUT(
      uploadRequest({ file: null, consent: "true" }),
      {
        params: Promise.resolve({ id: entryId }),
      },
    );
    expect(missingFile.status).toBe(400);

    const missingConsent = await PUT(uploadRequest(), {
      params: Promise.resolve({ id: entryId }),
    });
    expect(missingConsent.status).toBe(400);
    expect(mocks.uploadContestPhoto).not.toHaveBeenCalled();
  });

  it("stores the event-scoped asset and returns only a temporary preview URL", async () => {
    const response = await PUT(uploadRequest({ consent: "true" }), {
      params: Promise.resolve({ id: entryId }),
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      photoUrl: "https://private.example/temporary",
      uploadedAt: "2026-10-01T00:00:00.000Z",
    });
    expect(mocks.saveContestPhotoForGuest).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        eventId: new ObjectId(eventId),
        entryId: new ObjectId(entryId),
        rsvpId: new ObjectId(rsvpId),
        photo: expect.objectContaining({
          assetId: "asset-1",
          consentByRsvpId: rsvpId,
        }),
      }),
    );
    expect(mocks.retryContestPhotoCleanup).toHaveBeenCalledWith(
      expect.anything(),
      new ObjectId(eventId),
      expect.any(Date),
    );
  });

  it("queues the newly uploaded asset for safe cleanup after a failed save", async () => {
    mocks.saveContestPhotoForGuest.mockRejectedValue(new Error("write failed"));
    const response = await PUT(uploadRequest({ consent: "true" }), {
      params: Promise.resolve({ id: entryId }),
    });
    expect(response.status).toBe(500);
    expect(mocks.enqueueContestPhotoCleanup).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        assetId: "asset-1",
        eventId: new ObjectId(eventId),
      }),
    );
    expect(mocks.logServerError).toHaveBeenCalledOnce();
  });
});
