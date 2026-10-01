// Fotoğrafları yüklemeden önce tarayıcıda küçültür. Telefonla çekilmiş
// 3–8 MB'lık bir fotoğraf ~100–250 KB'a iner; menü hızlı açılır ve depolama
// / veri trafiği maliyeti düşer. Yalnızca tarayıcıda çalışır.

export type CompressOptions = {
  // Uzun kenarın en fazla piksel değeri.
  maxSize?: number;
  quality?: number;
};

export type CompressedImage = { file: File; extension: string };

const SKIP_TYPES = new Set(["image/gif", "image/svg+xml"]);

async function decode(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      // Telefon fotoğraflarındaki yön (EXIF) bilgisine uyulur.
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // Bazı tarayıcılar seçeneği desteklemez; aşağıdaki yönteme düşülür.
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = "async";
    image.src = url;
    await image.decode();
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}

// Küçültülmüş dosyayı döndürür. Küçültme mümkün değilse ya da kazanç
// yoksa özgün dosya döner; yükleme hiçbir durumda bu yüzden durmaz.
export async function compressImage(file: File, options: CompressOptions = {}): Promise<CompressedImage> {
  const maxSize = options.maxSize ?? 1200;
  const quality = options.quality ?? 0.8;
  const originalExtension = (file.name.split(".").pop() || "jpg").toLowerCase();
  const original = { file, extension: originalExtension };

  if (!file.type.startsWith("image/") || SKIP_TYPES.has(file.type)) return original;

  try {
    const image = await decode(file);
    const width = "naturalWidth" in image ? image.naturalWidth : image.width;
    const height = "naturalHeight" in image ? image.naturalHeight : image.height;
    if (!width || !height) return original;

    const scale = Math.min(1, maxSize / Math.max(width, height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const context = canvas.getContext("2d");
    if (!context) return original;

    // Saydam PNG logolar saydam kalsın diye arka plan boyanmaz.
    context.imageSmoothingQuality = "high";
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    if ("close" in image) image.close();

    // WebP tercih edilir; desteklemeyen tarayıcı (eski Safari) PNG döndürürse JPEG'e geçilir.
    let blob = await toBlob(canvas, "image/webp", quality);
    let type = "image/webp";
    if (!blob || blob.type !== "image/webp") {
      const hasAlpha = file.type === "image/png";
      type = hasAlpha ? "image/png" : "image/jpeg";
      blob = await toBlob(canvas, type, quality);
    }
    if (!blob || blob.size >= file.size) return original;

    const extension = type === "image/webp" ? "webp" : type === "image/png" ? "png" : "jpg";
    const name = file.name.replace(/\.[^.]+$/, "") + "." + extension;
    return { file: new File([blob], name, { type }), extension };
  } catch {
    return original;
  }
}
