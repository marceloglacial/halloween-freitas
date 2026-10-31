import { beforeEach, describe, expect, it, vi } from "vitest";
import { ObjectId } from "mongodb";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  isAdmin: vi.fn(),
  getDb: vi.fn(),
  getMongoClient: vi.fn(),
  getEventById: vi.fn(),
  getPartyAlbumForAdmin: vi.fn(),
  setPartyAlbumPublication: vi.fn(),
  partyPhotoPreviewUrl: vi.fn(),
  logServerError: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({ auth: mocks.auth }));
vi.mock("@/lib/auth/admin", () => ({ isAdmin: mocks.isAdmin }));
vi.mock("@/lib/db", () => ({
  getDb: mocks.getDb,
  getMongoClient: mocks.getMongoClient,
}));
vi.mock("@/lib/events", () => ({ getEventById: mocks.getEventById }));
vi.mock("@/lib/http", () => ({
  logServerError: mocks.logServerError,
  readJsonObject: async (request: Request) => request.json().catch(() => null),
}));
vi.mock("@/lib/party-photos", () => ({
  partyPhotoPreviewUrl: mocks.partyPhotoPreviewUrl,
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
  getPartyAlbumForAdmin: mocks.getPartyAlbumForAdmin,
  setPartyAlbumPublication: mocks.setPartyAlbumPublication,
}));

import { GET, PATCH } from "@/app/api/admin/events/[id]/party-photos/route";

const eventId = "507f1f77bcf86cd799439011";
const photoId = new ObjectId("507f1f77bcf86cd799439012");
const event = { _id: eventId } as HalloweenEvent;

function context(id = eventId) {
  return { params: Promise.resolve({ id }) };
}

function request(published: unknown) {
  return new Request("http://localhost", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ published }),
  });
}

describe("admin party album API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ userId: "admin-user" });
    mocks.isAdmin.mockResolvedValue(true);
    mocks.getDb.mockResolvedValue({});
    mocks.getMongoClient.mockResolvedValue({});
    mocks.getEventById.mockResolvedValue(event);
    mocks.getPartyAlbumForAdmin.mockResolvedValue({
      album: {
        published: false,
        createdAt: new Date("2026-10-31T20:00:00.000Z"),
      },
      photos: [
        {
          _id: photoId,
          eventId: new ObjectId(eventId),
          assetId: "private-asset",
          publicId: "party-photos/private-photo",
          format: "jpg",
          bytes: 2048,
          width: 1200,
          height: 800,
          uploadedAt: new Date("2026-10-31T20:00:00.000Z"),
        },
      ],
    });
    mocks.partyPhotoPreviewUrl.mockReturnValue("https://private.example/photo");
    mocks.setPartyAlbumPublication.mockResolvedValue({
      published: true,
      publishedAt: new Date("2026-10-31T20:00:00.000Z"),
      updatedAt: new Date("2026-10-31T20:00:00.000Z"),
    });
  });

  it("denies non-admin album reads without querying photo data", async () => {
    mocks.isAdmin.mockResolvedValue(false);

    const response = await GET(new Request("http://localhost"), context());

    expect(response.status).toBe(401);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(mocks.getPartyAlbumForAdmin).not.toHaveBeenCalled();
  });

  it("returns safe private previews scoped to the requested edition", async () => {
    const response = await GET(new Request("http://localhost"), context());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(mocks.getPartyAlbumForAdmin).toHaveBeenCalledWith(
      expect.anything(),
      new ObjectId(eventId),
    );
    expect(body.photos).toEqual([
      {
        photoId: photoId.toString(),
        previewUrl: "https://private.example/photo",
        uploadedAt: "2026-10-31T20:00:00.000Z",
        bytes: 2048,
        width: 1200,
        height: 800,
        format: "jpg",
      },
    ]);
    expect(JSON.stringify(body)).not.toContain("private-asset");
    expect(JSON.stringify(body)).not.toContain("party-photos/private-photo");
  });

  it("returns an explicit private empty album state when no album model exists yet", async () => {
    mocks.getPartyAlbumForAdmin.mockResolvedValue({ album: null, photos: [] });

    const response = await GET(new Request("http://localhost"), context());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      published: false,
      publishedAt: null,
      updatedAt: null,
      photos: [],
    });
  });

  it("rejects malformed publication state without writing", async () => {
    const response = await PATCH(request("yes"), context());

    expect(response.status).toBe(400);
    expect(mocks.setPartyAlbumPublication).not.toHaveBeenCalled();
  });

  it("records publication against the selected event and authenticated admin", async () => {
    const response = await PATCH(request(true), context());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(mocks.setPartyAlbumPublication).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        eventId: new ObjectId(eventId),
        published: true,
        actorId: "admin-user",
        now: expect.any(Date),
      }),
    );
    expect(body).toEqual({
      published: true,
      publishedAt: "2026-10-31T20:00:00.000Z",
      updatedAt: "2026-10-31T20:00:00.000Z",
    });
  });
});
