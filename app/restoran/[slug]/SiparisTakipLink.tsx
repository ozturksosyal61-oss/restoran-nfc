"use client";

import { useEffect, useState } from "react";

export default function SiparisTakipLink({
  slug,
  tableToken,
}: {
  slug: string;
  tableToken: string;
}) {
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    const token = tableToken?.trim();
    if (!token) {
      setOrderId(null);
      return;
    }

    const key = `ozt_last_order_${slug}_${token}`;
    const savedOrderId = localStorage.getItem(key);

    if (savedOrderId && /^\d+$/.test(savedOrderId)) {
      setOrderId(savedOrderId);
    } else {
      setOrderId(null);
    }
  }, [slug, tableToken]);

  if (!orderId || !tableToken) {
    return null;
  }

  const href = `/restoran/${slug}/siparis/takip/${orderId}?masa=${encodeURIComponent(
    tableToken
  )}`;

  return (
    <section style={{ marginTop: 14 }}>
      <a
        href={href}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          width: "100%",
          boxSizing: "border-box",
          padding: "14px 16px",
          borderRadius: 18,
          textDecoration: "none",
          background: "rgba(255,255,255,.88)",
          border: "1px solid rgba(184,134,11,.26)",
          color: "#2d271f",
          boxShadow: "0 8px 20px rgba(74,54,25,.06)",
        }}
      >
        <span style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <span style={{ fontSize: 12, fontWeight: 900, letterSpacing: ".02em" }}>
            🟢 Sipariş Takibine Dön
          </span>
          <span style={{ fontSize: 10, color: "#857867", fontWeight: 700 }}>
            Son sipariş #{orderId}
          </span>
        </span>

        <span style={{ fontSize: 18, fontWeight: 900, color: "#b8860b" }}>
          →
        </span>
      </a>
    </section>
  );
}
