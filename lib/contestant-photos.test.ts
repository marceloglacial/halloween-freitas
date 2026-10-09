import { afterEach, describe, expect, it, vi } from "vitest";

const cloudinaryMocks = vi.hoisted(() => ({
  config: vi.fn(),
  uploadStream: vi.fn(),
  destroy: vi.fn(),
  privateDownloadUrl: vi.fn(),
}));

vi.mock("cloudinary", () => ({
  v2: {
    config: cloudinaryMocks.config,
    uploader: {
      upload_stream: cloudinaryMocks.uploadStream,
      destroy: cloudinaryMocks.destroy,
    },
    utils: { private_download_url: cloudinaryMocks.privateDownloadUrl },
  },
}));

import {
  ContestPhotoInputError,
  MAX_CONTEST_PHOTO_BYTES,
  contestPhotoPreviewUrl,
  deleteContestPhotoAsset,
  uploadContestPhoto,
  validateContestPhoto,
} from "@/lib/contestant-photos";

afterEach(() => vi.unstubAllEnvs());

describe("contestant photo validation and Cloudinary storage", () => {
  it.each([
    ["image/jpeg", Buffer.from([0xff, 0xd8, 0xff, 0x00]), "jpg"],
    ["image/png", Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), "png"],
    ["image/webp", Buffer.from("RIFFxxxxWEBP", "ascii"), "webp"],
  ] as const)("accepts a valid %s header", (type, bytes, format) => {
    expect(
      validateContestPhoto({ type, size: bytes.length, name: "photo" }, bytes),
    ).toBe(format);
  });

  it("rejects disguised, unsupported, and oversized file content", () => {
    expect(() =>
      validateContestPhoto(
        { type: "image/png", size: 3, name: "photo.png" },
        Buffer.from("<svg"),
      ),
    ).toThrow(ContestPhotoInputError);
    expect(() =>
      validateContestPhoto(
        { type: "image/gif", size: 4, name: "photo.gif" },
        Buffer.from("GIF8"),
      ),
    ).toThrow("Envie uma foto JPG, PNG ou WebP válida.");
    expect(() =>
      validateContestPhoto(
        {
          type: "image/jpeg",
          size: MAX_CONTEST_PHOTO_BYTES + 1,
          name: "large.jpg",
        },
        Buffer.from([0xff, 0xd8, 0xff]),
      ),
    ).toThrow("A foto deve ter até 8 MB.");
  });

  it("stores uploads as authenticated assets in an event-scoped contest folder", async () => {
    vi.stubEnv("NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME", "development-cloud");
    vi.stubEnv("CLOUDINARY_API_KEY", "development-key");
    vi.stubEnv("CLOUDINARY_API_SECRET", "development-secret");
    cloudinaryMocks.uploadStream.mockImplementation((_options, callback) => ({
      end: () =>
        callback(null, {
          asset_id: "asset-id",
          public_id: "contest-photos/edition/photo",
          format: "jpeg",
          bytes: 1024,
          width: 1200,
          height: 800,
        }),
    }));

    await expect(
      uploadContestPhoto(
        "507f1f77bcf86cd799439011",
        Buffer.from([0xff, 0xd8, 0xff]),
        "jpg",
        new Date("2026-10-01T00:00:00.000Z"),
      ),
    ).resolves.toEqual({
      assetId: "asset-id",
      publicId: "contest-photos/edition/photo",
      format: "jpg",
      bytes: 1024,
      width: 1200,
      height: 800,
      uploadedAt: new Date("2026-10-01T00:00:00.000Z"),
    });
    expect(cloudinaryMocks.config).toHaveBeenCalledWith({
      cloud_name: "development-cloud",
      api_key: "development-key",
      api_secret: "development-secret",
    });
    expect(cloudinaryMocks.uploadStream).toHaveBeenCalledWith(
      expect.objectContaining({
        resource_type: "image",
        type: "authenticated",
        folder: "contest-photos/507f1f77bcf86cd799439011",
        overwrite: false,
      }),
      expect.any(Function),
    );
  });

  it("rejects oversized image dimensions and exposes only cleanup identifiers", async () => {
    vi.stubEnv("NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME", "development-cloud");
    vi.stubEnv("CLOUDINARY_API_KEY", "development-key");
    vi.stubEnv("CLOUDINARY_API_SECRET", "development-secret");
    cloudinaryMocks.uploadStream.mockImplementation((_options, callback) => ({
      end: () =>
        callback(null, {
          asset_id: "large-asset",
          public_id: "contest-photos/edition/large",
          format: "png",
          bytes: 1024,
          width: 10_001,
          height: 1,
        }),
    }));

    await expect(
      uploadContestPhoto("507f1f77bcf86cd799439011", Buffer.from("x"), "png"),
    ).rejects.toMatchObject({
      status: 415,
      cleanupAsset: {
        assetId: "large-asset",
        publicId: "contest-photos/edition/large",
      },
    });
  });

  it("generates an expiring authenticated preview URL", () => {
    vi.stubEnv("NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME", "development-cloud");
    vi.stubEnv("CLOUDINARY_API_KEY", "development-key");
    vi.stubEnv("CLOUDINARY_API_SECRET", "development-secret");
    cloudinaryMocks.privateDownloadUrl.mockReturnValue("temporary-url");

    expect(
      contestPhotoPreviewUrl(
        "contest-photos/edition/photo",
        "webp",
        1_800_000_000,
      ),
    ).toBe("temporary-url");
    expect(cloudinaryMocks.privateDownloadUrl).toHaveBeenCalledWith(
      "contest-photos/edition/photo",
      "webp",
      {
        resource_type: "image",
        type: "authenticated",
        expires_at: 1_800_000_000,
      },
    );
  });

  it("invalidates only authenticated image assets on deletion", async () => {
    vi.stubEnv("NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME", "development-cloud");
    vi.stubEnv("CLOUDINARY_API_KEY", "development-key");
    vi.stubEnv("CLOUDINARY_API_SECRET", "development-secret");
    cloudinaryMocks.destroy.mockResolvedValue({ result: "ok" });

    await expect(
      deleteContestPhotoAsset("contest-photos/edition/photo"),
    ).resolves.toEqual({ deleted: true });
    expect(cloudinaryMocks.destroy).toHaveBeenCalledWith(
      "contest-photos/edition/photo",
      { resource_type: "image", type: "authenticated", invalidate: true },
    );
  });
});
