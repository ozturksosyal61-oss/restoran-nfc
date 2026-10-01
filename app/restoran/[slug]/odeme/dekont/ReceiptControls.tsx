"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import AuroraIcon from "../../AuroraIcon";
import { pendingKey } from "../pay-utils";

// Sonuç kesinleşince yarım kalan ödeme hatırlatması silinir; sonuç henüz
// gelmediyse (PayTR bildirimi birkaç saniye sürebilir) sayfa yenilenir.
export function ReceiptWatcher({ slug, reference, pending }: { slug: string; reference: string; pending: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (pending) return;
    try {
      if (window.localStorage.getItem(pendingKey(slug)) === reference) {
        window.localStorage.removeItem(pendingKey(slug));
      }
    } catch {
      // yok sayılır
    }
  }, [pending, reference, slug]);

  useEffect(() => {
    if (!pending) return;
    let tries = 0;
    const timer = window.setInterval(() => {
      tries += 1;
      router.refresh();
      if (tries >= 30) window.clearInterval(timer);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [pending, router]);

  return null;
}

export function PrintButton({ className }: { className?: string }) {
  return (
    <button type="button" className={className} onClick={() => window.print()}>
      <AuroraIcon name="receipt" size={16} />
      PDF olarak kaydet
    </button>
  );
}
