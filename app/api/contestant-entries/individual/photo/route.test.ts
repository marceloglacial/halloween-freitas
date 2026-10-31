import { MongoServerError, ObjectId } from "mongodb";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getGuestRegistration: vi.fn(),
  getEventById: vi.fn(),
  getDb: vi.fn(),
  getMongoClient: vi.fn(),
  createEntry: vi.fn(),
  validatePhoto: vi.fn(),
  uploadPhoto: vi.fn(),
  previewUrl: vi.fn(),
  enqueueCleanup: vi.fn(),
  retryCleanup: vi.fn(),
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
vi.mock("@/lib/contestant-entry-mutations", () => ({
  ContestantEntryWriteError: class ContestantEntryWriteError extends Error {
    constructor(
      public status: number,
      public code: string,
    ) {
      super(code);
    }
  },
  createIndividualContestantEntryWithPhoto: mocks.createEntry,
}));
vi.mock("@/lib/contestant-entry-writes", () => ({
  ContestEntryClosedError: class ContestEntryClosedError extends Error {},
}));
vi.mock("@/lib/contestant-photos", () => ({
  MAX_CONTEST_PHOTO_BYTES: 8 * 1024 * 1024,
  ContestPhotoInputError: class ContestPhotoInputError extends Error {
    constructor(
      public status: number,
      message: string,
      public cleanupAsset?: { assetId: string; publicId: string },
    ) {
      super(message);
    }
  },
  validateContestPhoto: mocks.validatePhoto,
  uploadContestPhoto: mocks.uploadPhoto,
  contestPhotoPreviewUrl: mocks.previewUrl,
}));
vi.mock("@/lib/contestant-photo-cleanup", () => ({
  enqueueContestPhotoCleanup: mocks.enqueueCleanup,
  retryContestPhotoCleanup: mocks.retryCleanup,
}));
vi.mock("@/lib/db", () => ({
  getDb: mocks.getDb,
  getMongoClient: mocks.getMongoClient,
}));
vi.mock("@/lib/events", () => ({ getEventById: mocks.getEventById }));
vi.mock("@/lib/http", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/http")>();
  return { ...actual, logServerError: mocks.logServerError };
});

import { POST } from "@/app/api/contestant-entries/individual/photo/route";

const eventId = "507f1f77bcf86cd799439011";
const rsvpId = "507f1f77bcf86cd799439012";
const categoryId = new ObjectId("507f1f77bcf86cd799439013");
const entryId = new ObjectId("507f1f77bcf86cd799439014");
const event = {
  _id: eventId,
  status: "active",
  registrationStartsAt: "2026-09-01T00:00:00.000Z",
  contestEntryStatus: "open",
  votingStatus: "not_started",
};
const uploaded = {
  assetId: "asset-id",
  publicId: `contest-photos/${eventId}/photo-id`,
  format: "png" as const,
  bytes: 8,
  width: 10,
  height: 10,
  uploadedAt: new Date("2026-09-15T00:00:00.000Z"),
};

function request(options?: {
  consent?: boolean;
  title?: string;
  photo?: boolean;
}) {
  const body = new FormData();
  if (options?.photo !== false) {
    body.set(
      "image",
      new File(
        [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])],
        "foto.png",
        {
          type: "image/png",
        },
      ),
    );
  }
  if (options?.consent !== false) body.set("photoConsent", "true");
  if (options?.title) body.set("costumeTitle", options.title);
  return new Request(
    `http://localhost/api/contestant-entries/individual/photo?eventId=${eventId}`,
    { method: "POST", body },
  );
}

describe("individual contestant creation by photo", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-15T00:00:00.000Z"));
    vi.clearAllMocks();
    mocks.getEventById.mockResolvedValue(event);
    mocks.getGuestRegistration.mockResolvedValue({
      userId: rsvpId,
      eventId,
      fullName: "Ana Freitas",
    });
    mocks.getDb.mockResolvedValue({});
    mocks.getMongoClient.mockResolvedValue({});
    mocks.validatePhoto.mockReturnValue("png");
    mocks.uploadPhoto.mockResolvedValue(uploaded);
    mocks.previewUrl.mockReturnValue("https://private.example/photo");
    mocks.createEntry.mockResolvedValue({
      _id: entryId,
      eventId: new ObjectId(eventId),
      categoryId,
      entryType: "individual",
      displayName: "Ana Freitas",
      costumeTitle: "Bruxa",
      status: "ready",
    });
  });

  it("creates a ready individual participation only when a photo is saved", async () => {
    const response = await POST(request({ title: "  Bruxa  " }));

    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({
      _id: entryId.toString(),
      entryType: "individual",
      status: "ready",
      photoUrl: "https://private.example/photo",
    });
    expect(mocks.createEntry).toHaveBeenCalledWith(
      {},
      {},
      expect.objectContaining({
        eventId: new ObjectId(eventId),
        rsvpId: new ObjectId(rsvpId),
        displayName: "Ana Freitas",
        costumeTitle: "Bruxa",
        photo: expect.objectContaining({
          assetId: "asset-id",
          consentByRsvpId: rsvpId,
        }),
      }),
    );
  });

  it("requires both a photo and consent", async () => {
    expect((await POST(request({ photo: false }))).status).toBe(400);
    expect((await POST(request({ consent: false }))).status).toBe(400);
    expect(mocks.uploadPhoto).not.toHaveBeenCalled();
  });

  it("rejects creation after the unified enrollment window closes", async () => {
    mocks.getEventById.mockResolvedValue({
      ...event,
      contestEntryStatus: "closed",
    });
    expect((await POST(request())).status).toBe(409);
    expect(mocks.uploadPhoto).not.toHaveBeenCalled();
  });

  it("derives ownership from the same-edition verified RSVP", async () => {
    const GuestAccessError = (await import("@/lib/auth/guest-registration"))
      .GuestAccessError;
    mocks.getGuestRegistration.mockRejectedValue(
      new GuestAccessError(403, "unlinked", "Verifique seu acesso."),
    );
    expect((await POST(request())).status).toBe(403);
    expect(mocks.uploadPhoto).not.toHaveBeenCalled();
  });

  it("queues the uploaded asset for cleanup when persistence loses a race", async () => {
    mocks.createEntry.mockRejectedValue(
      new MongoServerError({ code: 11000, message: "duplicate owner" }),
    );

    const response = await POST(request());
    expect(response.status).toBe(409);
    expect(mocks.enqueueCleanup).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        eventId: new ObjectId(eventId),
        assetId: uploaded.assetId,
        publicId: uploaded.publicId,
      }),
    );
  });
});
