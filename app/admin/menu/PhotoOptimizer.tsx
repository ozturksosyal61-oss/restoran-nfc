"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AdminIcon from "../AdminIcon";
import { createClient } from "../../../lib/supabase/client";
import { compressImage } from "../../../lib/image-compress";

// Daha önce küçültülmeden yüklenmiş fotoğrafları bir defalığına küçültür:
// ürün fotoğrafları, logo ve kapak. Fotoğraf tarayıcıda indirilir,
// küçültülür, yeni adla yüklenir ve kayıt yeni fotoğrafa bağlanır.
// Dış bağlantılar (ör. Unsplash) bu sistemin deposunda olmadığı için atlanır.

type Photo = { id: number; image_url: string };
type Assets = { restaurantId: number; logoUrl: string | null; coverUrl: string | null };

type Job = {
  url: string;
  bucket: "product-images" | "restaurant-assets";
  maxSize: number;
  // Yeni dosyanın yolu ve kaydın güncellenmesi.
  newPath: (extension: string) => string;
  save: (supabase: ReturnType<typeof createClient>, publicUrl: string) => Promise<{ error: { message: string } | null }>;
  // Eski dosya silinebilir mi (ürün fotoğraflarında silme izni yok).
  removable: boolean;
};

// Bu boyutun altındaki fotoğraflar zaten yeterince küçük sayılır.
const SKIP_BELOW = 250 * 1024;

function storagePath(url: string | null, bucket: string) {
  if (!url) return null;
  const marker = `/object/public/${bucket}/`;
  const index = url.indexOf(marker);
  return index === -1 ? null : decodeURIComponent(url.slice(index + marker.length).split("?")[0]);
}

function mb(bytes: number) {
  return `${(bytes / (1024 * 1024)).toLocaleString("tr-TR", { maximumFractionDigits: 1 })} MB`;
}

export default function PhotoOptimizer({ photos, assets }: { photos: Photo[]; assets: Assets }) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(0);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  const jobs: Job[] = [];
  for (const photo of photos) {
    if (!storagePath(photo.image_url, "product-images")) continue;
    jobs.push({
      url: photo.image_url,
      bucket: "product-images",
      maxSize: 1200,
      newPath: (extension) => `products/${crypto.randomUUID()}.${extension}`,
      save: async (supabase, publicUrl) => supabase.from("products").update({ image_url: publicUrl }).eq("id", photo.id),
      // Aynı fotoğrafı kullanan başka ürün yoksa silinmeye çalışılır.
      removable: !photos.some((other) => other.id !== photo.id && other.image_url === photo.image_url),
    });
  }
  for (const [field, url, maxSize] of [
    ["logo_url", assets.logoUrl, 600],
    ["cover_image_url", assets.coverUrl, 1600],
  ] as const) {
    if (!storagePath(url, "restaurant-assets")) continue;
    jobs.push({
      url: url!,
      bucket: "restaurant-assets",
      maxSize,
      newPath: (extension) => `${assets.restaurantId}/${field === "logo_url" ? "logo" : "cover"}-${Date.now()}.${extension}`,
      save: async (supabase, publicUrl) =>
        supabase.from("restaurants").update({ [field]: publicUrl }).eq("id", assets.restaurantId),
      removable: true,
    });
  }

  if (jobs.length === 0) return null;

  async function run() {
    setRunning(true);
    setResult(null);
    setDone(0);

    const supabase = createClient();
    let before = 0;
    let after = 0;
    let changed = 0;
    let failed = 0;
    let firstError = "";

    for (const job of jobs) {
      try {
        const response = await fetch(job.url, { cache: "no-store" });
        if (!response.ok) throw new Error(`Fotoğraf indirilemedi (${response.status}).`);
        const blob = await response.blob();

        if (blob.size < SKIP_BELOW) {
          setDone((value) => value + 1);
          continue;
        }

        const name = storagePath(job.url, job.bucket)?.split("/").pop() || "foto.jpg";
        const original = new File([blob], name, { type: blob.type || "image/jpeg" });
        const compressed = await compressImage(original, { maxSize: job.maxSize });
        if (compressed.file === original || compressed.file.size > blob.size * 0.8) {
          setDone((value) => value + 1);
          continue;
        }

        const newPath = job.newPath(compressed.extension);
        const { error: uploadError } = await supabase.storage
          .from(job.bucket)
          .upload(newPath, compressed.file, { cacheControl: "31536000", contentType: compressed.file.type });
        if (uploadError) throw uploadError;

        const publicUrl = supabase.storage.from(job.bucket).getPublicUrl(newPath).data.publicUrl;
        const { error: updateError } = await job.save(supabase, publicUrl);
        if (updateError) {
          await supabase.storage.from(job.bucket).remove([newPath]);
          throw updateError;
        }

        // Eski dosya silinemezse sorun değil (yalnızca depoda yer kaplar).
        const oldPath = storagePath(job.url, job.bucket);
        if (oldPath && job.removable) await supabase.storage.from(job.bucket).remove([oldPath]);

        before += blob.size;
        after += compressed.file.size;
        changed += 1;
      } catch (error) {
        failed += 1;
        if (!firstError) firstError = (error as { message?: string })?.message ?? "Bilinmeyen hata";
      }
      setDone((value) => value + 1);
    }

    setRunning(false);
    setResult(
      changed === 0 && failed === 0
        ? { ok: true, text: "Fotoğraflarınız zaten küçük; bir şey yapmak gerekmedi." }
        : {
            ok: failed === 0,
            text:
              (changed > 0 ? `${changed} fotoğraf küçültüldü: ${mb(before)} → ${mb(after)}.` : "") +
              (failed > 0 ? ` ${failed} fotoğraf işlenemedi (${firstError}).` : ""),
          }
    );
    router.refresh();
  }

  return (
    <section className="adm-card" aria-labelledby="foto-kucult">
      <div className="adm-card-head">
        <div>
          <h2 id="foto-kucult">Fotoğrafları hızlandır</h2>
          <p>
            Büyük fotoğraflar menünün yavaş açılmasına neden olur. Bu işlem ürün fotoğraflarını, logoyu ve kapak
            fotoğrafını görünür kalite kaybı olmadan küçültür. Yeni yüklediğiniz fotoğraflar zaten otomatik
            küçültülüyor.
          </p>
        </div>
      </div>
      {result && (
        <p className={`adm-alert ${result.ok ? "adm-alert-ok" : "adm-alert-error"}`} role="status" style={{ margin: 0 }}>
          <AdminIcon name={result.ok ? "check" : "alert"} size={16} />
          {result.text.trim()}
        </p>
      )}
      <div className="adm-form-actions" style={{ justifyContent: "flex-start" }}>
        <button type="button" className="adm-btn" onClick={() => void run()} disabled={running}>
          <AdminIcon name="image" size={16} />
          {running ? `Küçültülüyor… ${done}/${jobs.length}` : `${jobs.length} fotoğrafı kontrol et ve küçült`}
        </button>
      </div>
    </section>
  );
}
