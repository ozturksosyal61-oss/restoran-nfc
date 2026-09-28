"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";
import AdminIcon from "../AdminIcon";

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
    <div className="adm-session-actions">
      <button
        type="button"
        className="adm-btn adm-btn-primary adm-btn-block"
        onClick={closeSession}
        disabled={loading}
      >
        <AdminIcon name="wallet" size={16} />
        {loading ? "Hesap kapatılıyor…" : "Hesabı kapat, ödendi say"}
      </button>
      {message && (
        <p className={`adm-alert ${message.startsWith("✓") ? "adm-alert-ok" : "adm-alert-error"}`} role="status" style={{ margin: 0 }}>
          {message.replace(/^✓s*/, "")}
        </p>
      )}
    </div>
  );
}
