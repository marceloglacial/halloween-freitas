import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ObjectId } from "mongodb";

const mocks = vi.hoisted(() => ({
  getGuestRegistration: vi.fn(),
  getDb: vi.fn(),
  getMongoClient: vi.fn(),
  getEventById: vi.fn(),
  uploadPartyPhoto: vi.fn(),
  partyPhotoPreviewUrl: vi.fn(),
  deletePartyPhotoAsset: vi.fn(),
  savePartyPhoto: vi.fn(),
  getPartyPhotosForGuest: vi.fn(),
  serializePartyPhotoForGuest: vi.fn(),
  enqueuePartyPhotoCleanup: vi.fn(),
  retryPartyPhotoCleanup: vi.fn(),
  consumeRateLimit: vi.fn(),
  trustedClientAddress: vi.fn(),
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
  return {
    GuestAccessError,
    getGuestRegistration: mocks.getGuestRegistration,
  };
});
vi.mock("@/lib/db", () => ({
  getDb: mocks.getDb,
  getMongoClient: mocks.getMongoClient,
}));
vi.mock("@/lib/events", () => ({ getEventById: mocks.getEventById }));
vi.mock("@/lib/http", () => ({
  errorResponse: (message: string, status: number) =>
    Response.json({ error: message }, { status }),
  logServerError: mocks.logServerError,
}));
vi.mock("@/lib/party-photos", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/party-photos")>();
  return {
    ...actual,
    uploadPartyPhoto: mocks.uploadPartyPhoto,
    partyPhotoPreviewUrl: mocks.partyPhotoPreviewUrl,
    deletePartyPhotoAsset: mocks.deletePartyPhotoAsset,
  };
});
vi.mock("@/lib/party-photo-writes", () => {
  class PartyAlbumWriteError extends Error {
    constructor(
      public status: number,
      message: string,
    ) {
      super(message);
    }
  }
  return {
    PartyAlbumWriteError,
    savePartyPhoto: mocks.savePartyPhoto,
    getPartyPhotosForGuest: mocks.getPartyPhotosForGuest,
    serializePartyPhotoForGuest: mocks.serializePartyPhotoForGuest,
    enqueuePartyPhotoCleanup: mocks.enqueuePartyPhotoCleanup,
    retryPartyPhotoCleanup: mocks.retryPartyPhotoCleanup,
  };
});
vi.mock("@/lib/request-rate-limits", () => ({
  consumeRateLimit: mocks.consumeRateLimit,
  rateLimitResponse: (retryAfter: number) =>
    Response.json(
      { error: "Muitas tentativas. Tente novamente mais tarde." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    ),
  requestRateLimitPolicies: {
    partyPhotoAddress: { action: "party-photo-address" },
    partyPhotoGuest: { action: "party-photo-guest" },
  },
  trustedClientAddress: mocks.trustedClientAddress,
}));

import { GuestAccessError } from "@/lib/auth/guest-registration";
import { GET, POST } from "@/app/api/party-photos/route";

const eventId = "507f1f77bcf86cd799439011";
const rsvpId = "507f1f77bcf86cd799439012";
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
  votingStatus: "open",
  resultsPublished: false,
};
const asset = {
  assetId: "private-asset-id",
  publicId: "party-photos/event/private-public-id",
  format: "png" as const,
  bytes: 8,
  width: 1,
  height: 1,
  uploadedAt: new Date("2026-11-01T00:00:00.000Z"),
};

function uploadRequest(options: { eventId?: string; file?: File } = {}) {
  const form = new FormData();
  form.set(
    "image",
    options.file ??
      new File([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])], "party.png", {
        type: "image/png",
      }),
  );
  return new Request(
    `http://localhost/api/party-photos?eventId=${options.eventId ?? eventId}`,
    { method: "POST", body: form },
  );
}

describe("party photo API", () => {
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
    mocks.uploadPartyPhoto.mockResolvedValue(asset);
    mocks.partyPhotoPreviewUrl.mockReturnValue("https://private/temporary");
    mocks.deletePartyPhotoAsset.mockResolvedValue({ deleted: true });
    mocks.savePartyPhoto.mockResolvedValue({
      _id: new ObjectId("507f1f77bcf86cd799439013"),
      eventId: new ObjectId(eventId),
      uploaderRsvpId: new ObjectId(rsvpId),
      ...asset,
    });
    mocks.getPartyPhotosForGuest.mockResolvedValue([]);
    mocks.serializePartyPhotoForGuest.mockImplementation(
      (photo, previewUrl) => ({
        photoId: photo._id.toString(),
        previewUrl,
        uploadedAt: photo.uploadedAt.toISOString(),
        width: photo.width,
        height: photo.height,
        format: photo.format,
      }),
    );
    mocks.enqueuePartyPhotoCleanup.mockResolvedValue(undefined);
    mocks.retryPartyPhotoCleanup.mockResolvedValue(undefined);
    mocks.consumeRateLimit.mockResolvedValue({
      allowed: true,
      retryAfterSeconds: 100,
    });
    mocks.trustedClientAddress.mockReturnValue("203.0.113.8");
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("rejects invalid event IDs before resolving guest identity", async () => {
    const response = await POST(uploadRequest({ eventId: "bad" }));
    expect(response.status).toBe(400);
    expect(mocks.getGuestRegistration).not.toHaveBeenCalled();
  });

  it("requires a verified same-edition RSVP", async () => {
    mocks.getGuestRegistration.mockRejectedValue(
      new GuestAccessError(403, "unlinked", "Verifique seu acesso."),
    );
    const response = await POST(uploadRequest());
    expect(response.status).toBe(403);
    expect(mocks.uploadPartyPhoto).not.toHaveBeenCalled();
  });

  it("rejects uploads until the selected party starts", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-31T19:59:59.999Z"));
    const response = await POST(uploadRequest());
    expect(response.status).toBe(409);
    expect(mocks.consumeRateLimit).not.toHaveBeenCalled();
    expect(mocks.uploadPartyPhoto).not.toHaveBeenCalled();
  });

  it("allows an upload exactly at eventStartsAt", async () => {
    const start = new Date("2026-11-01T00:00:00.000Z");
    vi.useFakeTimers();
    vi.setSystemTime(start);
    mocks.getEventById.mockResolvedValue({
      ...event,
      eventStartsAt: start.toISOString(),
    });
    const response = await POST(uploadRequest());
    expect(response.status).toBe(200);
    expect(mocks.uploadPartyPhoto).toHaveBeenCalled();
  });

  it("applies both address and guest rate limits before upload", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-01T00:00:00.000Z"));
    mocks.consumeRateLimit
      .mockResolvedValueOnce({ allowed: true, retryAfterSeconds: 50 })
      .mockResolvedValueOnce({ allowed: false, retryAfterSeconds: 80 });
    const response = await POST(uploadRequest());
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("80");
    expect(mocks.consumeRateLimit).toHaveBeenCalledTimes(2);
    expect(mocks.uploadPartyPhoto).not.toHaveBeenCalled();
  });

  it("fails closed when production has no trusted client address", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-01T00:00:00.000Z"));
    mocks.trustedClientAddress.mockReturnValue(null);
    const response = await POST(uploadRequest());
    expect(response.status).toBe(503);
    expect(mocks.consumeRateLimit).not.toHaveBeenCalled();
    expect(mocks.uploadPartyPhoto).not.toHaveBeenCalled();
  });

  it("rejects an oversized request before parsing the multipart body", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-01T00:00:00.000Z"));
    const form = new FormData();
    form.set("image", new File(["photo"], "photo.png", { type: "image/png" }));
    const request = new Request(
      `http://localhost/api/party-photos?eventId=${eventId}`,
      {
        method: "POST",
        headers: { "content-length": String(9 * 1024 * 1024) },
        body: form,
      },
    );
    const response = await POST(request);
    expect(response.status).toBe(413);
    expect(mocks.uploadPartyPhoto).not.toHaveBeenCalled();
  });

  it("stores an event-scoped private photo and returns no Cloudinary IDs", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-01T00:00:00.000Z"));
    const response = await POST(uploadRequest());
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    const payload = await response.json();
    expect(payload.photo).toEqual({
      photoId: "507f1f77bcf86cd799439013",
      previewUrl: "https://private/temporary",
      uploadedAt: asset.uploadedAt.toISOString(),
      width: 1,
      height: 1,
      format: "png",
    });
    expect(JSON.stringify(payload)).not.toContain("private-asset-id");
    expect(JSON.stringify(payload)).not.toContain("private-public-id");
    expect(mocks.savePartyPhoto).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      {
        eventId: new ObjectId(eventId),
        uploaderRsvpId: new ObjectId(rsvpId),
        asset,
      },
    );
    expect(mocks.uploadPartyPhoto).toHaveBeenCalledWith(
      eventId,
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      expect.any(Date),
    );
  });

  it("rejects spoofed file content before sending it to Cloudinary", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-01T00:00:00.000Z"));
    const response = await POST(
      uploadRequest({
        file: new File(["<svg"], "fake.png", { type: "image/png" }),
      }),
    );
    expect(response.status).toBe(415);
    expect(mocks.uploadPartyPhoto).not.toHaveBeenCalled();
    expect(mocks.savePartyPhoto).not.toHaveBeenCalled();
  });

  it("queues and attempts cleanup if photo metadata cannot be saved", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-01T00:00:00.000Z"));
    mocks.savePartyPhoto.mockRejectedValue(new Error("database unavailable"));
    const response = await POST(uploadRequest());
    expect(response.status).toBe(500);
    expect(mocks.enqueuePartyPhotoCleanup).toHaveBeenCalledWith(
      expect.anything(),
      {
        eventId: new ObjectId(eventId),
        assetId: asset.assetId,
        publicId: asset.publicId,
        now: expect.any(Date),
      },
    );
    expect(mocks.retryPartyPhotoCleanup).toHaveBeenCalled();
  });

  it("returns only the signed-in guest's event-scoped photo previews", async () => {
    const photo = {
      _id: new ObjectId("507f1f77bcf86cd799439013"),
      eventId: new ObjectId(eventId),
      uploaderRsvpId: new ObjectId(rsvpId),
      ...asset,
    };
    mocks.getPartyPhotosForGuest.mockResolvedValue([photo]);
    const response = await GET(
      new Request(`http://localhost/api/party-photos?eventId=${eventId}`),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(mocks.getPartyPhotosForGuest).toHaveBeenCalledWith(
      expect.anything(),
      new ObjectId(eventId),
      new ObjectId(rsvpId),
    );
    expect(mocks.partyPhotoPreviewUrl).toHaveBeenCalledWith(
      asset.publicId,
      asset.format,
    );
  });

  it("does not read private photos when the guest has no event RSVP", async () => {
    mocks.getGuestRegistration.mockRejectedValue(
      new GuestAccessError(403, "unlinked", "Verifique seu acesso."),
    );
    const response = await GET(
      new Request(`http://localhost/api/party-photos?eventId=${eventId}`),
    );
    expect(response.status).toBe(403);
    expect(mocks.getPartyPhotosForGuest).not.toHaveBeenCalled();
  });
});
