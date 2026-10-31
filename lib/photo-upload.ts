export const MAX_PHOTO_UPLOAD_BYTES = 4 * 1024 * 1024;
export const MAX_PHOTO_SOURCE_BYTES = 25 * 1024 * 1024;

const supportedPhotoTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

const compressionSizes = [2560, 2048, 1600, 1280, 1024];
const compressionQualities = [0.85, 0.75, 0.65, 0.55];

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Não foi possível preparar a foto para envio."));
      },
      "image/jpeg",
      quality,
    );
  });
}

export async function preparePhotoUpload(file: File): Promise<File> {
  if (!supportedPhotoTypes.has(file.type)) {
    throw new Error("Envie uma foto JPG, PNG ou WebP válida.");
  }
  if (file.size <= 0) {
    throw new Error("Selecione uma foto válida para enviar.");
  }
  if (file.size > MAX_PHOTO_SOURCE_BYTES) {
    throw new Error("A foto original deve ter até 25 MB.");
  }
  if (file.size <= MAX_PHOTO_UPLOAD_BYTES) return file;

  if (typeof createImageBitmap !== "function") {
    throw new Error(
      "Não foi possível otimizar esta foto no navegador. Tente uma imagem menor.",
    );
  }

  let image: ImageBitmap;
  try {
    image = await createImageBitmap(file);
  } catch {
    throw new Error(
      "Não foi possível abrir esta foto. Tente salvá-la como JPG ou escolher outra imagem.",
    );
  }

  const canvas = document.createElement("canvas");
  try {
    if (!image.width || !image.height) {
      throw new Error("A imagem selecionada não tem dimensões válidas.");
    }
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error(
        "Não foi possível otimizar esta foto no navegador. Tente uma imagem menor.",
      );
    }

    for (const maxDimension of compressionSizes) {
      const scale = Math.min(
        1,
        maxDimension / Math.max(image.width, image.height),
      );
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      context.fillStyle = "#fff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);

      for (const quality of compressionQualities) {
        const blob = await canvasToJpeg(canvas, quality);
        if (blob.size <= MAX_PHOTO_UPLOAD_BYTES) {
          const baseName = file.name.replace(/\.[^.]*$/, "") || "foto";
          return new File([blob], `${baseName}.jpg`, {
            type: "image/jpeg",
            lastModified: file.lastModified,
          });
        }
      }
    }

    throw new Error(
      "Não foi possível reduzir esta foto o suficiente. Tente escolher uma imagem menor.",
    );
  } finally {
    image.close();
    canvas.width = 0;
    canvas.height = 0;
  }
}

export async function photoUploadError(
  response: Response,
  fallback: string,
): Promise<string> {
  if (response.status === 413) {
    return "A foto ainda ficou grande demais para o envio. Escolha uma imagem menor.";
  }

  const body = (await response.json().catch(() => null)) as {
    error?: string;
  } | null;
  return body?.error || fallback;
}
