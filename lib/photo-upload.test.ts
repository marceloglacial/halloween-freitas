import { afterEach, describe, expect, it, vi } from "vitest";
import {
  MAX_PHOTO_UPLOAD_BYTES,
  photoUploadError,
  preparePhotoUpload,
} from "@/lib/photo-upload";

afterEach(() => vi.unstubAllGlobals());

describe("photo upload preparation", () => {
  it("compresses a large supported image below the serverless request limit", async () => {
    const image = {
      width: 4000,
      height: 3000,
      close: vi.fn(),
    };
    const context = {
      fillRect: vi.fn(),
      drawImage: vi.fn(),
      fillStyle: "",
    };
    const canvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => context),
      toBlob: vi.fn((callback: BlobCallback) => {
        callback(new Blob([new Uint8Array(1024)], { type: "image/jpeg" }));
      }),
    };
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn(async () => image),
    );
    vi.stubGlobal("document", {
      createElement: vi.fn(() => canvas),
    });

    const source = new File(
      [new Uint8Array(MAX_PHOTO_UPLOAD_BYTES + 1)],
      "android-photo.png",
      { type: "image/png" },
    );
    const prepared = await preparePhotoUpload(source);

    expect(prepared).not.toBe(source);
    expect(prepared.type).toBe("image/jpeg");
    expect(prepared.name).toBe("android-photo.jpg");
    expect(prepared.size).toBeLessThanOrEqual(MAX_PHOTO_UPLOAD_BYTES);
    expect(image.close).toHaveBeenCalledOnce();
  });

  it("keeps small supported images unchanged", async () => {
    const source = new File(["photo"], "photo.jpg", { type: "image/jpeg" });

    await expect(preparePhotoUpload(source)).resolves.toBe(source);
  });

  it("turns a non-JSON payload-too-large response into a readable error", async () => {
    const response = new Response("Request Entity Too Large", {
      status: 413,
      headers: { "content-type": "text/plain" },
    });

    await expect(
      photoUploadError(response, "Não foi possível enviar a foto."),
    ).resolves.toContain("grande demais");
  });
});
