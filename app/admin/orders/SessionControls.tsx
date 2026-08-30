"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";

export default function SessionControls({
  sessionId,
}: {
  sessionId: number;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function closeSession() {
    if (loading) return;

    const confirmed = window.confirm(
      `Oturum #${sessionId} hesabını kapatmak ve açık siparişleri ödendi olarak işaretlemek istediğinize emin misiniz?`
    );

    if (!confirmed) return;

    setLoading(true);
    setMessage("");

    try {
      const { error } = await supabase.rpc(
        "close_dining_session",
        {
          p_session_id: sessionId,
        }
      );

      if (error) {
        console.error(
          "Hesap kapatma hatası:",
          error
        );

        setMessage(
          `Hesap kapatılamadı: ${error.message}`
        );

        return;
      }

      setMessage("✓ Hesap kapatıldı.");

      router.refresh();
    } catch (error) {
      console.error(error);

      setMessage(
        "Hesap kapatılırken hata oluştu."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minWidth: "180px",
        textAlign: "right",
      }}
    >
      <button
        type="button"
        onClick={closeSession}
        disabled={loading}
        style={{
          width: "100%",
          border: "none",
          borderRadius: "11px",
          padding: "11px 14px",
          background:
            loading ? "#aaa" : "#171717",
          color: "#fff",
          fontSize: "11px",
          fontWeight: 900,
          cursor:
            loading
              ? "not-allowed"
              : "pointer",
        }}
      >
        {loading
          ? "Hesap Kapatılıyor..."
          : "💳 Hesabı Kapat / Ödendi"}
      </button>

      {message && (
        <div
          style={{
            marginTop: "7px",
            color:
              message.startsWith("✓")
                ? "#15803d"
                : "#b42318",
            fontSize: "10px",
            fontWeight: 700,
          }}
        >
          {message}
        </div>
      )}
    </div>
  );
}