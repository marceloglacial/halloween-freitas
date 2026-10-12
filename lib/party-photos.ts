import { v2 as cloudinary } from "cloudinary";
import { randomUUID } from "node:crypto";

export const MAX_PARTY_PHOTO_BYTES = 8 * 1024 * 1024;
export const MAX_PARTY_PHOTO_PIXELS = 40_000_000;
export const MAX_PARTY_PHOTO_DIMENSION = 10_000;
export const PARTY_PHOTO_PREVIEW_TTL_SECONDS = 5 * 60;

export type PartyPhotoFormat = "jpg" | "png" | "webp";

export type PartyPhotoAsset = {
  assetId: string;
  publicId: string;
  format: PartyPhotoFormat;
  bytes: number;
  width: number;
  height: number;
  uploadedAt: Date;
};

export class PartyPhotoInputError extends Error {
  constructor(
    public status: number,
    message: string,
    public cleanupAsset?: { assetId: string; publicId: string },
  ) {
    super(message);
  }
}

function cloudinaryClient() {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("CLOUDINARY_NOT_CONFIGURED");
  }
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });
  return cloudinary;
}

export function validatePartyPhoto(
  file: Pick<File, "type" | "size">,
  bytes: Buffer,
): PartyPhotoFormat {
  if (
    file.size <= 0 ||
    file.size > MAX_PARTY_PHOTO_BYTES ||
    bytes.length !== file.size
  ) {
    throw new PartyPhotoInputError(413, "A foto deve ter até 8 MB.");
  }

  const matches = [
    {
      format: "jpg" as const,
      mime: "image/jpeg",
      valid:
        bytes.length >= 3 &&
        bytes[0] === 0xff &&
        bytes[1] === 0xd8 &&
        bytes[2] === 0xff,
    },
    {
      format: "png" as const,
      mime: "image/png",
      valid:
        bytes.length >= 8 &&
        bytes
          .subarray(0, 8)
          .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
    },
    {
      format: "webp" as const,
      mime: "image/webp",
      valid:
        bytes.length >= 12 &&
        bytes.toString("ascii", 0, 4) === "RIFF" &&
        bytes.toString("ascii", 8, 12) === "WEBP",
    },
  ];
  const match = matches.find(
    (candidate) => candidate.valid && candidate.mime === file.type,
  );
  if (!match) {
    throw new PartyPhotoInputError(
      415,
      "Envie uma foto JPG, PNG ou WebP válida.",
    );
  }
  return match.format;
}

export async function uploadPartyPhoto(
  eventId: string,
  buffer: Buffer,
  now = new Date(),
): Promise<PartyPhotoAsset> {
  const client = cloudinaryClient();
  const publicId = randomUUID();
  const result = await new Promise<{
    asset_id?: string;
    public_id?: string;
    format?: string;
    bytes?: number;
    width?: number;
    height?: number;
  }>((resolve, reject) => {
    const stream = client.uploader.upload_stream(
      {
        resource_type: "image",
        type: "authenticated",
        folder: `party-photos/${eventId}`,
        public_id: publicId,
        overwrite: false,
        allowed_formats: ["jpg", "jpeg", "png", "webp"],
        tags: ["party-photo"],
      },
      (error, response) => {
        if (error || !response)
          return reject(error ?? new Error("CLOUDINARY_UPLOAD_FAILED"));
        resolve(response);
      },
    );
    stream.end(buffer);
  });

  if (
    !result.asset_id ||
    !result.public_id ||
    !result.bytes ||
    !result.width ||
    !result.height ||
    !["jpg", "jpeg", "png", "webp"].includes(result.format ?? "") ||
    result.bytes > MAX_PARTY_PHOTO_BYTES ||
    result.width > MAX_PARTY_PHOTO_DIMENSION ||
    result.height > MAX_PARTY_PHOTO_DIMENSION ||
    result.width * result.height > MAX_PARTY_PHOTO_PIXELS
  ) {
    throw new PartyPhotoInputError(
      415,
      "A foto não passou pela validação de conteúdo.",
      result.asset_id
        ? { assetId: result.asset_id, publicId: result.public_id ?? publicId }
        : undefined,
    );
  }

  return {
    assetId: result.asset_id,
    publicId: result.public_id,
    format:
      result.format === "jpeg" ? "jpg" : (result.format as PartyPhotoFormat),
    bytes: result.bytes,
    width: result.width,
    height: result.height,
    uploadedAt: now,
  };
}

export function partyPhotoPreviewUrl(
  publicId: string,
  format: PartyPhotoFormat,
  expiresAt = Math.floor(Date.now() / 1000) + PARTY_PHOTO_PREVIEW_TTL_SECONDS,
) {
  return cloudinaryClient().utils.private_download_url(publicId, format, {
    resource_type: "image",
    type: "authenticated",
    expires_at: expiresAt,
  });
}

export async function deletePartyPhotoAsset(publicId: string) {
  const result = await cloudinaryClient().uploader.destroy(publicId, {
    resource_type: "image",
    type: "authenticated",
    invalidate: true,
  });
  if (result.result !== "ok" && result.result !== "not found") {
    throw new Error("CLOUDINARY_DELETE_FAILED");
  }
  return { deleted: result.result === "ok" };
}
