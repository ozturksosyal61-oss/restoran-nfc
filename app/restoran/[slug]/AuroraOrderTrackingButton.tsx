"use client";

import { useEffect, useState } from "react";

type Props = {
  slug: string;
  tableToken?: string | null;
};

export default function AuroraOrderTrackingButton({
  slug,
  tableToken,
}: Props) {
  const [orderId, setOrderId] = useState("");

  useEffect(() => {
    if (!slug || typeof window === "undefined") return;

    try {
      const tokens = [
        tableToken?.trim() || "",
        localStorage.getItem("ozt_table_token")?.trim() || "",
        localStorage.getItem("ozt_table_public_token")?.trim() || "",
        localStorage.getItem("table_token")?.trim() || "",
      ].filter(Boolean);

      for (const token of tokens) {
        const saved = localStorage
          .getItem(`ozt_last_order_${slug}_${token}`)
          ?.trim() || "";

        if (saved) {
          setOrderId(saved);
          return;
        }
      }

      // Aynı restoran için son siparişi bul; mevcut çalışan sipariş
      // kayıt mekanizmasına dokunmadan sadece navigasyon sağlar.
      const prefix = `ozt_last_order_${slug}_`;

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key?.startsWith(prefix)) continue;

        const saved = localStorage.getItem(key)?.trim() || "";
        if (saved) {
          setOrderId(saved);
          return;
        }
      }
    } catch {
      setOrderId("");
    }
  }, [slug, tableToken]);

  if (!orderId) return null;

  const query = tableToken
    ? `?masa=${encodeURIComponent(tableToken)}`
    : "";

  return (
    <a
      href={`/restoran/${slug}/siparis/takip/${encodeURIComponent(orderId)}${query}`}
      className="aurora-nav-link aurora-order-track-nav"
      aria-label="Sipariş takip"
      title="Sipariş takip"
    >
      <span className="aurora-order-track-nav-icon" aria-hidden="true">
        ◉
      </span>
      <span className="aurora-order-track-nav-text">
        SİPARİŞ TAKİP
      </span>
    </a>
  );
}
