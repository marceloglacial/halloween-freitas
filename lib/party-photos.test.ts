import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  config: vi.fn(),
  uploadStream: vi.fn(),
  destroy: vi.fn(),
  privateDownloadUrl: vi.fn(),
}));

vi.mock("cloudinary", () => ({
  v2: {
    config: mocks.config,
    uploader: {
      upload_stream: mocks.uploadStream,
      destroy: mocks.destroy,
    },
    utils: { private_download_url: mocks.privateDownloadUrl },
  },
}));

import {
  deletePartyPhotoAsset,
  MAX_PARTY_PHOTO_BYTES,
  PartyPhotoInputError,
  partyPhotoPreviewUrl,
  uploadPartyPhoto,
  validatePartyPhoto,
} from "@/lib/party-photos";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetAllMocks();
});

describe("party photo storage", () => {
  it.each([
    ["image/jpeg", Buffer.from([0xff, 0xd8, 0xff, 0x00]), "jpg"],
    ["image/png", Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), "png"],
    ["image/webp", Buffer.from("RIFFxxxxWEBP", "ascii"), "webp"],
  ] as const)("accepts valid %s content", (type, bytes, format) => {
    expect(validatePartyPhoto({ type, size: bytes.length }, bytes)).toBe(
      format,
    );
  });

  it("rejects spoofed formats and files over the per-photo limit", () => {
    expect(() =>
      validatePartyPhoto({ type: "image/png", size: 4 }, Buffer.from("<svg")),
    ).toThrow(PartyPhotoInputError);
    expect(() =>
      validatePartyPhoto(
        { type: "image/jpeg", size: MAX_PARTY_PHOTO_BYTES + 1 },
        Buffer.alloc(3),
      ),
    ).toThrow("A foto deve ter até 8 MB.");
  });

  it("uploads signed authenticated assets under a separate event folder", async () => {
    vi.stubEnv("NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME", "development-cloud");
    vi.stubEnv("CLOUDINARY_API_KEY", "development-key");
    vi.stubEnv("CLOUDINARY_API_SECRET", "development-secret");
    mocks.uploadStream.mockImplementation((_options, callback) => ({
      end: () =>
        callback(null, {
          asset_id: "asset-id",
          public_id: "party-photos/event/photo",
          format: "jpeg",
          bytes: 1024,
          width: 1200,
          height: 800,
        }),
    }));

    await expect(
      uploadPartyPhoto(
        "507f1f77bcf86cd799439011",
        Buffer.from([0xff, 0xd8, 0xff]),
        new Date("2026-10-31T20:00:00.000Z"),
      ),
    ).resolves.toEqual({
      assetId: "asset-id",
      publicId: "party-photos/event/photo",
      format: "jpg",
      bytes: 1024,
      width: 1200,
      height: 800,
      uploadedAt: new Date("2026-10-31T20:00:00.000Z"),
    });
    expect(mocks.uploadStream).toHaveBeenCalledWith(
      expect.objectContaining({
        resource_type: "image",
        type: "authenticated",
        folder: "party-photos/507f1f77bcf86cd799439011",
        overwrite: false,
      }),
      expect.any(Function),
    );
  });

  it("rejects invalid image dimensions with only private cleanup identifiers", async () => {
    vi.stubEnv("NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME", "development-cloud");
    vi.stubEnv("CLOUDINARY_API_KEY", "development-key");
    vi.stubEnv("CLOUDINARY_API_SECRET", "development-secret");
    mocks.uploadStream.mockImplementation((_options, callback) => ({
      end: () =>
        callback(null, {
          asset_id: "asset-id",
          public_id: "party-photos/event/photo",
          format: "png",
          bytes: 1024,
          width: 10_001,
          height: 1,
        }),
    }));

    await expect(
      uploadPartyPhoto("507f1f77bcf86cd799439011", Buffer.from("png")),
    ).rejects.toMatchObject({
      status: 415,
      cleanupAsset: {
        assetId: "asset-id",
        publicId: "party-photos/event/photo",
      },
    });
  });

  it("creates expiring authenticated preview URLs and deletes only private assets", async () => {
    vi.stubEnv("NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME", "development-cloud");
    vi.stubEnv("CLOUDINARY_API_KEY", "development-key");
    vi.stubEnv("CLOUDINARY_API_SECRET", "development-secret");
    mocks.privateDownloadUrl.mockReturnValue("temporary-url");
    mocks.destroy.mockResolvedValue({ result: "ok" });

    expect(
      partyPhotoPreviewUrl("party-photos/event/photo", "webp", 1_800_000_000),
    ).toBe("temporary-url");
    expect(mocks.privateDownloadUrl).toHaveBeenCalledWith(
      "party-photos/event/photo",
      "webp",
      {
        resource_type: "image",
        type: "authenticated",
        expires_at: 1_800_000_000,
      },
    );
    await expect(
      deletePartyPhotoAsset("party-photos/event/photo"),
    ).resolves.toEqual({ deleted: true });
    expect(mocks.destroy).toHaveBeenCalledWith("party-photos/event/photo", {
      resource_type: "image",
      type: "authenticated",
      invalidate: true,
    });
  });
});
