// Tarayıcıda WebP'ye çevirir. Simge: ortadan kareye kırpılıp 512 px; ekran
// görüntüsü: genişlik en fazla 1170 px (büyütme yok). Yalnızca tarayıcıda çalışır.

export async function toWebp(file: File, kind: "icon" | "screen"): Promise<File> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Görsel işlenemedi.");
  context.imageSmoothingQuality = "high";

  if (kind === "icon") {
    const side = Math.min(bitmap.width, bitmap.height);
    canvas.width = canvas.height = Math.min(512, side);
    context.drawImage(
      bitmap,
      (bitmap.width - side) / 2,
      (bitmap.height - side) / 2,
      side,
      side,
      0,
      0,
      canvas.width,
      canvas.height
    );
  } else {
    const scale = Math.min(1, 1170 / bitmap.width);
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  }
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.85));
  if (!blob || blob.type !== "image/webp") throw new Error("Bu tarayıcı WebP üretemiyor.");
  return new File([blob], "image.webp", { type: "image/webp" });
}
