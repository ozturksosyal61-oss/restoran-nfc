"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type Props = {
  orderId: number;
  currentStatus: string;
};

const statusLabels: Record<string, string> = {
  pending: "Yeni Sipariş",
  accepted: "Kabul Edildi",
  preparing: "Hazırlanıyor",
  ready: "Hazır",
  delivered: "Tamamlandı",
};

const statusIcons: Record<string, string> = {
  pending: "🔔",
  accepted: "👍",
  preparing: "👨‍🍳",
  ready: "✅",
  delivered: "✓",
};

export default function OrderActions({
  orderId,
  currentStatus,
}: Props) {
  const router = useRouter();

  const [status, setStatus] =
    useState(currentStatus);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  async function updateStatus(
    newStatus: string
  ) {
    if (
      loading ||
      newStatus === status
    ) {
      return;
    }

    setLoading(true);
    setError("");

    // --------------------------------------------------
    // SUPABASE GÜNCELLE
    // --------------------------------------------------

    const { error } = await supabase
      .from("orders")
      .update({
        status: newStatus,
      })
      .eq("id", orderId);

    if (error) {
      console.error(
        "Sipariş durum güncelleme hatası:",
        error
      );

      setError(
        "Sipariş durumu güncellenemedi."
      );

      setLoading(false);

      return;
    }

    // --------------------------------------------------
    // EKRANI ANINDA GÜNCELLE
    // --------------------------------------------------

    setStatus(newStatus);

    // --------------------------------------------------
    // SİPARİŞ KABUL EDİLDİ BİLDİRİMİ
    // --------------------------------------------------

    if (
      newStatus === "accepted"
    ) {
      window.dispatchEvent(
        new CustomEvent(
          "order-accepted",
          {
            detail: {
              orderId,
            },
          }
        )
      );
    }

    // --------------------------------------------------
    // SİPARİŞ HAZIR OLDU BİLDİRİMİ
    // --------------------------------------------------

    if (
      newStatus === "ready"
    ) {
      window.dispatchEvent(
        new CustomEvent(
          "order-ready",
          {
            detail: {
              orderId,
            },
          }
        )
      );
    }

    // --------------------------------------------------
    // TESLİM EDİLDİ BİLDİRİMİ
    // --------------------------------------------------

    if (
      newStatus === "delivered"
    ) {
      window.dispatchEvent(
        new CustomEvent(
          "order-delivered",
          {
            detail: {
              orderId,
            },
          }
        )
      );
    }

    setLoading(false);

    // Server component'i yenile
    router.refresh();
  }

  // ==================================================
  // BİR SONRAKİ BUTON
  // ==================================================

  function renderNextAction() {
    if (loading) {
      return (
        <button
          type="button"
          disabled
          className="order-action-button order-action-loading"
        >
          <span>⏳</span>
          Güncelleniyor...
        </button>
      );
    }

    switch (status) {
      // -----------------------------------------------
      // YENİ SİPARİŞ
      // -----------------------------------------------

      case "pending":
        return (
          <button
            type="button"
            className="order-action-button order-action-accept"
            onClick={() =>
              updateStatus(
                "accepted"
              )
            }
          >
            <span>👍</span>

            <span>
              Siparişi Kabul Et
            </span>

            <span className="order-action-arrow">
              →
            </span>
          </button>
        );

      // -----------------------------------------------
      // KABUL EDİLDİ
      // -----------------------------------------------

      case "accepted":
        return (
          <button
            type="button"
            className="order-action-button order-action-prepare"
            onClick={() =>
              updateStatus(
                "preparing"
              )
            }
          >
            <span>👨‍🍳</span>

            <span>
              Hazırlamaya Başla
            </span>

            <span className="order-action-arrow">
              →
            </span>
          </button>
        );

      // -----------------------------------------------
      // HAZIRLANIYOR
      // -----------------------------------------------

      case "preparing":
        return (
          <button
            type="button"
            className="order-action-button order-action-ready"
            onClick={() =>
              updateStatus(
                "ready"
              )
            }
          >
            <span>✅</span>

            <span>
              Siparişi Hazırla
            </span>

            <span className="order-action-arrow">
              →
            </span>
          </button>
        );

      // -----------------------------------------------
      // HAZIR
      // -----------------------------------------------

      case "ready":
        return (
          <button
            type="button"
            className="order-action-button order-action-deliver"
            onClick={() =>
              updateStatus(
                "delivered"
              )
            }
          >
            <span>🛎️</span>

            <span>
              Teslim Edildi
            </span>

            <span className="order-action-arrow">
              →
            </span>
          </button>
        );

      // -----------------------------------------------
      // TAMAMLANDI
      // -----------------------------------------------

      case "delivered":
        return (
          <div className="order-action-completed">
            <span className="completed-icon">
              ✓
            </span>

            <span>
              Sipariş Tamamlandı
            </span>
          </div>
        );

      default:
        return null;
    }
  }

  return (
    <div className="order-actions">

      {/* =================================================
          MEVCUT DURUM
      ================================================== */}

      <div className="order-action-status">

        <span>
          SİPARİŞ DURUMU
        </span>

        <strong>

          <span
            className={`order-action-status-dot status-dot-${status}`}
          />

          <span>
            {statusIcons[status] || "•"}
          </span>

          {statusLabels[status] ||
            status}

        </strong>

      </div>

      {/* =================================================
          SONRAKİ İŞLEM
      ================================================== */}

      <div className="order-action-next">
        {renderNextAction()}
      </div>

      {/* =================================================
          HATA
      ================================================== */}

      {error && (
        <div
          style={{
            marginTop: "10px",
            padding:
              "9px 12px",
            borderRadius:
              "8px",
            background:
              "#fff0f0",
            color:
              "#b42318",
            fontSize:
              "11px",
            fontWeight:
              700,
          }}
        >
          ⚠️ {error}
        </div>
      )}

    </div>
  );
}