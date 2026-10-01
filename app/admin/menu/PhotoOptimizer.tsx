"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AdminIcon from "../AdminIcon";
import { createClient } from "../../../lib/supabase/client";
import { compressImage } from "../../../lib/image-compress";

// Daha önce küçültülmeden yüklenmiş ürün fotoğraflarını bir defalığına
// küçültür. Fotoğraf tarayıcıda indirilir, küçültülür, yeni adla yüklenir;
// ürün yeni fotoğrafa bağlanır ve eski dosya silinir.

type Photo = { id: number; image_url: string };

// Bu boyutun altındaki fotoğraflar zaten yeterince küçük sayılır.
const SKIP_BELOW = 350 * 1024;
const BUCKET = "product-images";

function storagePath(url: string) {
  const marker = `/object/public/${BUCKET}/`;
  const index = url.indexOf(marker);
  return index === -1 ? null : decodeURIComponent(url.slice(index + marker.length).split("?")[0]);
}

function mb(bytes: number) {
  return `${(bytes / (1024 * 1024)).toLocaleString("tr-TR", { maximumFractionDigits: 1 })} MB`;
}

export default function PhotoOptimizer({ photos }: { photos: Photo[] }) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(0);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  // Yalnızca bu sistemin deposundaki fotoğraflar işlenir (dış bağlantılar değil).
  const candidates = photos.filter((photo) => storagePath(photo.image_url));
  if (candidates.length === 0) return null;

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

    for (const photo of candidates) {
      try {
        const response = await fetch(photo.image_url, { cache: "no-store" });
        if (!response.ok) throw new Error(`Fotoğraf indirilemedi (${response.status}).`);
        const blob = await response.blob();

        if (blob.size < SKIP_BELOW) {
          setDone((value) => value + 1);
          continue;
        }

        const original = new File([blob], storagePath(photo.image_url)?.split("/").pop() || "foto.jpg", {
          type: blob.type || "image/jpeg",
        });
        const compressed = await compressImage(original);
        if (compressed.file === original || compressed.file.size > blob.size * 0.8) {
          setDone((value) => value + 1);
          continue;
        }

        const newPath = `products/${crypto.randomUUID()}.${compressed.extension}`;
        const { error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(newPath, compressed.file, { cacheControl: "31536000", contentType: compressed.file.type });
        if (uploadError) throw uploadError;

        const publicUrl = supabase.storage.from(BUCKET).getPublicUrl(newPath).data.publicUrl;
        const { error: updateError } = await supabase.from("products").update({ image_url: publicUrl }).eq("id", photo.id);
        if (updateError) {
          await supabase.storage.from(BUCKET).remove([newPath]);
          throw updateError;
        }

        // Aynı fotoğrafı kullanan başka ürün yoksa eski dosya silinir; silinemezse sorun değil.
        const oldPath = storagePath(photo.image_url);
        const shared = photos.some((other) => other.id !== photo.id && other.image_url === photo.image_url);
        if (oldPath && !shared) await supabase.storage.from(BUCKET).remove([oldPath]);

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
            Büyük ürün fotoğrafları menünün yavaş açılmasına neden olur. Bu işlem eski fotoğrafları görünür kalite
            kaybı olmadan küçültür. Yeni yüklediğiniz fotoğraflar zaten otomatik küçültülüyor.
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
          {running ? `Küçültülüyor… ${done}/${candidates.length}` : `${candidates.length} fotoğrafı kontrol et ve küçült`}
        </button>
      </div>
    </section>
  );
}
