"use client";

import { useState } from "react";
import { pendingKey } from "./pay-utils";

// Ödeme sayfasından vazgeçer: ayrılan ürünler hemen serbest kalır.
export default function CancelPaymentButton({
  slug,
  reference,
  href,
  className,
  children,
}: {
  slug: string;
  reference: string;
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  const [busy, setBusy] = useState(false);

  async function cancel() {
    setBusy(true);
    await fetch("/api/odeme/masa/iptal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ref: reference }),
    }).catch(() => null);
    try {
      window.localStorage.removeItem(pendingKey(slug));
    } catch {
      // yok sayılır
    }
    window.location.assign(href);
  }

  return (
    <button type="button" className={className} onClick={() => void cancel()} disabled={busy}>
      {busy ? "İptal ediliyor…" : children}
    </button>
  );
}
