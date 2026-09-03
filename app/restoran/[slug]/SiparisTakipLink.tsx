"use client";

import { useEffect, useState } from "react";

export default function SiparisTakipLink({
  slug,
  tableToken,
}: {
  slug: string;
  tableToken?: string | null;
}) {
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    const token = tableToken?.trim() || localStorage.getItem("ozt_table_token")?.trim() || "";
    if (!token) return;

    const key = `ozt_last_order_${slug}_${token}`;
    const saved = localStorage.getItem(key)?.trim() || "";
    if (saved) setOrderId(saved);
  }, [slug, tableToken]);

  if (!orderId) return null;

  const token = tableToken?.trim() || localStorage.getItem("ozt_table_token")?.trim() || "";
  const query = token ? `?masa=${encodeURIComponent(token)}` : "";

  return (
    <a
      href={`/restoran/${slug}/siparis/takip/${orderId}${query}`}
      className="ozt-order-tracking-return"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        marginTop: 10,
        padding: "13px 15px",
        borderRadius: 18,
        textDecoration: "none",
        border: "1px solid rgba(181,139,69,.18)",
        background: "rgba(255,255,255,.72)",
        color: "#2d271f",
        boxShadow: "0 10px 24px rgba(82,65,43,.07)",
      }}
    >
      <span style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <strong style={{ fontSize: 13, fontWeight: 900 }}>🟢 Sipariş Takibine Dön</strong>
        <span style={{ fontSize: 10, color: "#7c7266", fontWeight: 700 }}>
          Son sipariş #{orderId}
        </span>
      </span>
      <span style={{ fontSize: 20, color: "#b58b45", fontWeight: 900 }}>›</span>
    </a>
  );
}
