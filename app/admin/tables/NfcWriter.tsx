"use client";

import { useState } from "react";

type Props = {
  url: string;
  tableNumber: number | string;
};

declare global {
  interface Window {
    NDEFReader?: any;
  }
}

export default function NfcWriter({
  url,
  tableNumber,
}: Props) {
  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  async function writeNfc() {
    setMessage("");
    setError("");

    if (!url) {
      setError(
        "NFC bağlantısı oluşturulamadı."
      );
      return;
    }

    if (
      typeof window === "undefined" ||
      !window.NDEFReader
    ) {
      setError(
        "Bu cihaz/tarayıcı Web NFC desteklemiyor. NFC yazmak için NFC destekli Android + Chrome kullanın."
      );
      return;
    }

    try {
      setLoading(true);

      const ndef =
        new window.NDEFReader();

      await ndef.write({
        records: [
          {
            recordType: "url",
            data: url,
          },
        ],
      });

      setMessage(
        `Masa ${tableNumber} NFC'ye başarıyla yazıldı.`
      );
    } catch (err) {
      console.error(
        "NFC yazma hatası:",
        err
      );

      setError(
        "NFC yazılamadı. NFC'nin açık olduğundan ve kartın telefona temas ettiğinden emin olun."
      );
    } finally {
      setLoading(false);
    }
  }

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(
        url
      );

      setMessage(
        "NFC bağlantısı kopyalandı."
      );
    } catch {
      setError(
        "Bağlantı kopyalanamadı."
      );
    }
  }

  return (
    <div
      style={{
        marginTop: "10px",
      }}
    >
      <button
        type="button"
        onClick={writeNfc}
        disabled={loading}
        style={{
          width: "100%",
          border: "none",
          background: loading
            ? "#999"
            : "#b8860b",
          color: "#fff",
          padding: "11px",
          borderRadius: "9px",
          fontWeight: 800,
          cursor: loading
            ? "not-allowed"
            : "pointer",
        }}
      >
        {loading
          ? "📡 NFC'ye Yazılıyor..."
          : "📡 NFC'ye Yaz"}
      </button>

      <button
        type="button"
        onClick={copyUrl}
        style={{
          width: "100%",
          marginTop: "7px",
          border: "1px solid #ddd",
          background: "#fff",
          color: "#222",
          padding: "9px",
          borderRadius: "9px",
          fontWeight: 700,
          cursor: "pointer",
          fontSize: "12px",
        }}
      >
        🔗 NFC URL'sini Kopyala
      </button>

      {message && (
        <div
          style={{
            marginTop: "8px",
            padding: "8px",
            background: "#edf9ef",
            color: "#18752b",
            borderRadius: "8px",
            fontSize: "11px",
            fontWeight: 700,
          }}
        >
          ✅ {message}
        </div>
      )}

      {error && (
        <div
          style={{
            marginTop: "8px",
            padding: "8px",
            background: "#fff0f0",
            color: "#b42318",
            borderRadius: "8px",
            fontSize: "11px",
            fontWeight: 700,
          }}
        >
          ⚠️ {error}
        </div>
      )}
    </div>
  );
}