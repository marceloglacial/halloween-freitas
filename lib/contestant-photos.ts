import { v2 as cloudinary } from "cloudinary";
import { randomUUID } from "node:crypto";

export const MAX_CONTEST_PHOTO_BYTES = 8 * 1024 * 1024;
export const MAX_CONTEST_PHOTO_PIXELS = 40_000_000;
export const MAX_CONTEST_PHOTO_DIMENSION = 10_000;

export type ContestPhotoFormat = "jpg" | "png" | "webp";

export type ContestPhotoAsset = {
  assetId: string;
  publicId: string;
  format: ContestPhotoFormat;
  bytes: number;
  width: number;
  height: number;
  uploadedAt: Date;
  consentAt: Date;
  consentByRsvpId: string;
};

export class ContestPhotoInputError extends Error {
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
  return { client: cloudinary, cloudName };
}

export function validateContestPhoto(
  file: Pick<File, "type" | "size" | "name">,
  bytes: Buffer,
): ContestPhotoFormat {
  if (
    file.size <= 0 ||
    file.size > MAX_CONTEST_PHOTO_BYTES ||
    bytes.length !== file.size
  ) {
    throw new ContestPhotoInputError(413, "A foto deve ter até 8 MB.");
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
    throw new ContestPhotoInputError(
      415,
      "Envie uma foto JPG, PNG ou WebP válida.",
    );
  }
  return match.format;
}

export async function uploadContestPhoto(
  eventId: string,
  buffer: Buffer,
  format: ContestPhotoFormat,
  now = new Date(),
): Promise<Omit<ContestPhotoAsset, "consentAt" | "consentByRsvpId">> {
  const { client } = cloudinaryClient();
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
        folder: `contest-photos/${eventId}`,
        public_id: publicId,
        overwrite: false,
        allowed_formats: ["jpg", "jpeg", "png", "webp"],
        tags: ["contest-photo"],
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
    result.bytes > MAX_CONTEST_PHOTO_BYTES ||
    result.width > MAX_CONTEST_PHOTO_DIMENSION ||
    result.height > MAX_CONTEST_PHOTO_DIMENSION ||
    result.width * result.height > MAX_CONTEST_PHOTO_PIXELS
  ) {
    throw new ContestPhotoInputError(
      415,
      "A foto não passou pela validação de conteúdo.",
      result.asset_id
        ? {
            assetId: result.asset_id,
            publicId: result.public_id ?? publicId,
          }
        : undefined,
    );
  }

  return {
    assetId: result.asset_id,
    publicId: result.public_id,
    format:
      result.format === "jpeg" ? "jpg" : (result.format as ContestPhotoFormat),
    bytes: result.bytes,
    width: result.width,
    height: result.height,
    uploadedAt: now,
  };
}

export async function deleteContestPhotoAsset(publicId: string) {
  const { client } = cloudinaryClient();
  const result = await client.uploader.destroy(publicId, {
    resource_type: "image",
    type: "authenticated",
    invalidate: true,
  });
  if (result.result !== "ok" && result.result !== "not found") {
    throw new Error("CLOUDINARY_DELETE_FAILED");
  }
  return { deleted: result.result === "ok" };
}

export function contestPhotoPreviewUrl(
  publicId: string,
  format: ContestPhotoFormat,
  expiresAt = Math.floor(Date.now() / 1000) + 5 * 60,
) {
  const { client } = cloudinaryClient();
  return client.utils.private_download_url(publicId, format, {
    resource_type: "image",
    type: "authenticated",
    expires_at: expiresAt,
  });
}
