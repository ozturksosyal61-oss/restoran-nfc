"use client";

import { useState } from "react";

type Props = {
  url: string;
};

export default function NfcUrlActions({ url }: Props) {
  const [copied, setCopied] = useState(false);

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(url);

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error("NFC URL kopyalanamadı:", error);
    }
  }

  function testUrl() {
    window.open(
      url,
      "_blank",
      "noopener,noreferrer"
    );
  }

  return (
    <div
      style={{
        display: "flex",
        gap: "8px",
        flexWrap: "wrap",
        marginTop: "12px",
      }}
    >
      <button
        type="button"
        onClick={copyUrl}
        style={{
          flex: 1,
          minWidth: "140px",
          padding: "10px 12px",
          borderRadius: "10px",
          border: "1px solid #e5dfd3",
          background: copied ? "#eaf8ef" : "#fff",
          color: copied ? "#16803c" : "#222",
          fontWeight: 800,
          fontSize: "12px",
          cursor: "pointer",
        }}
      >
        {copied
          ? "✓ URL Kopyalandı"
          : "📋 NFC URL Kopyala"}
      </button>

      <button
        type="button"
        onClick={testUrl}
        style={{
          flex: 1,
          minWidth: "120px",
          padding: "10px 12px",
          borderRadius: "10px",
          border: "1px solid #e5dfd3",
          background: "#111",
          color: "#fff",
          fontWeight: 800,
          fontSize: "12px",
          cursor: "pointer",
        }}
      >
        👁️ NFC Test Et
      </button>
    </div>
  );
}