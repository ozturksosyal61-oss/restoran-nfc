"use client";

import { useState } from "react";
import AdminIcon from "../AdminIcon";

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

  return (
    <div className="adm-nfc">
      <button
        type="button"
        className="adm-btn adm-btn-sm adm-btn-block adm-nfc-btn"
        onClick={writeNfc}
        disabled={loading || !url}
      >
        <AdminIcon name="nfc" size={15} />
        {loading ? "Etiketi telefona yaklaştırın…" : "NFC etikete yaz"}
      </button>
      {message && (
        <p className="adm-nfc-msg is-ok" role="status">{message}</p>
      )}
      {error && (
        <p className="adm-nfc-msg is-error" role="alert">{error}</p>
      )}
    </div>
  );
}
