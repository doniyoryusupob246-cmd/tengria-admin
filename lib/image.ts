/** The backend's limit on one photo (backend/src/storage/image-files.ts). */
const MAX_BYTES = 2 * 1024 * 1024;

export type PickedImage = { base64: string; mimeType: string; previewUrl: string };

/**
 * Shrinks a photo to fit the given box and re-encodes it as JPEG in the
 * browser, so a phone camera's 8 MB original arrives as a few hundred KB.
 */
export async function preparePhoto(file: File, maxWidth: number, maxHeight: number): Promise<PickedImage> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new Error("Sadece fotoğraf yüklenebilir (JPEG, PNG veya WebP).");
  }
  const source = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("Fotoğraf açılamadı."));
      element.src = source;
    });
    const ratio = Math.min(1, maxWidth / image.naturalWidth, maxHeight / image.naturalHeight);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(image.naturalWidth * ratio);
    canvas.height = Math.round(image.naturalHeight * ratio);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Fotoğraf işlenemedi.");
    // JPEG has no transparency; a transparent PNG would otherwise turn black.
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    for (const quality of [0.86, 0.76, 0.64]) {
      const dataUrl = canvas.toDataURL("image/jpeg", quality);
      const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
      if ((base64.length * 3) / 4 <= MAX_BYTES) return { base64, mimeType: "image/jpeg", previewUrl: dataUrl };
    }
    throw new Error("Fotoğraf çok büyük, daha küçük bir tane seç.");
  } finally {
    URL.revokeObjectURL(source);
  }
}
