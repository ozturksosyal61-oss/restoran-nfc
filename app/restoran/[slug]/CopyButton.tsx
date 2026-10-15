"use client";

import { useState } from "react";

// Bilgi ekranında WiFi şifresini kopyalama düğmesi (dört tasarımda ortak).
export default function CopyButton({ text, label = "Kopyala" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Eski tarayıcılar: geçici metin alanıyla.
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-live="polite"
      style={{
        display: "inline-flex",
        alignItems: "center",
        minHeight: 44,
        marginInlineStart: 8,
        padding: "0 14px",
        border: "1px solid var(--au-line, currentColor)",
        borderRadius: 999,
        background: "transparent",
        color: "inherit",
        font: "inherit",
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
      }}
    >
      {copied ? "Kopyalandı" : label}
    </button>
  );
}
