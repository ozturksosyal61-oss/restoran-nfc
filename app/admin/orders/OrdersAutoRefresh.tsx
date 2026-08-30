"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "../../../lib/supabase/client";

type Props = {
  restaurantId: number;
};

export default function OrdersAutoRefresh({
  restaurantId,
}: Props) {
  const [newOrders, setNewOrders] = useState<number[]>([]);
  const [notificationEnabled, setNotificationEnabled] =
    useState(false);

  const lastOrderId = useRef<number | null>(null);
  const firstCheck = useRef(true);
  const mountedRef = useRef(true);
  const reloadingRef = useRef(false);

  // --------------------------------------------------
  // SİPARİŞ KABUL EDİLDİ EVENTİ
  // --------------------------------------------------

  useEffect(() => {
    function handleOrderAccepted(event: Event) {
      const customEvent =
        event as CustomEvent<{ orderId: number }>;

      const orderId = customEvent.detail?.orderId;

      if (!orderId) {
        return;
      }

      setNewOrders((current) =>
        current.filter((id) => id !== orderId)
      );
    }

    window.addEventListener(
      "order-accepted",
      handleOrderAccepted
    );

    return () => {
      window.removeEventListener(
        "order-accepted",
        handleOrderAccepted
      );
    };
  }, []);

  // --------------------------------------------------
  // YENİ SİPARİŞ KONTROLÜ
  // --------------------------------------------------

  useEffect(() => {
    mountedRef.current = true;

    async function checkOrders() {
      if (reloadingRef.current) {
        return;
      }

      const supabase = createClient();

      const { data, error } = await supabase
        .from("orders")
        .select("id")
        .eq("restaurant_id", restaurantId)
        .order("id", {
          ascending: false,
        })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error(
          "Sipariş kontrol hatası:",
          error
        );
        return;
      }

      if (!mountedRef.current || !data) {
        return;
      }

      const currentOrderId = Number(data.id);

      // İlk kontrolde mevcut siparişi kaydet.
      if (firstCheck.current) {
        lastOrderId.current = currentOrderId;
        firstCheck.current = false;

        console.log(
          "İlk sipariş ID:",
          currentOrderId
        );

        return;
      }

      // ------------------------------------------------
      // YENİ SİPARİŞ GELDİ
      // ------------------------------------------------

      if (
        lastOrderId.current !== null &&
        currentOrderId > lastOrderId.current
      ) {
        reloadingRef.current = true;

        console.log(
          "🔔 YENİ SİPARİŞ ALGILANDI:",
          currentOrderId
        );

        setNewOrders((current) => {
          if (current.includes(currentOrderId)) {
            return current;
          }

          return [...current, currentOrderId];
        });

        // Tarayıcı bildirimi
        if (
          typeof Notification !== "undefined" &&
          Notification.permission === "granted"
        ) {
          new Notification(
            "🔔 Yeni Sipariş!",
            {
              body:
                `Yeni bir sipariş geldi. Sipariş No: #${currentOrderId}`,
              icon: "/favicon.ico",
            }
          );
        }

        lastOrderId.current = currentOrderId;

        // Önce Server Component'in yenilenmesini dene
        window.location.reload();
      }
    }

    // İlk kontrol
    checkOrders();

    // 2 saniyede bir kontrol
    const interval = setInterval(
      checkOrders,
      2000
    );

    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [restaurantId]);

  // --------------------------------------------------
  // SESLİ UYARI
  // --------------------------------------------------

  useEffect(() => {
    if (newOrders.length === 0) {
      return;
    }

    let audioContext: AudioContext | null = null;
    let cancelled = false;

    async function playNotificationSound() {
      try {
        if (typeof window === "undefined") {
          return;
        }

        const AudioContextClass =
          window.AudioContext ||
          (
            window as typeof window & {
              webkitAudioContext?: typeof AudioContext;
            }
          ).webkitAudioContext;

        if (!AudioContextClass) {
          return;
        }

        audioContext = new AudioContextClass();

        if (audioContext.state === "suspended") {
          await audioContext.resume();
        }

        // 3 kısa uyarı sesi
        for (let i = 0; i < 3; i++) {
          if (cancelled) {
            return;
          }

          const oscillator =
            audioContext.createOscillator();

          const gain =
            audioContext.createGain();

          oscillator.connect(gain);
          gain.connect(
            audioContext.destination
          );

          oscillator.type = "sine";

          oscillator.frequency.setValueAtTime(
            i % 2 === 0 ? 880 : 1046,
            audioContext.currentTime
          );

          gain.gain.setValueAtTime(
            0.001,
            audioContext.currentTime
          );

          gain.gain.exponentialRampToValueAtTime(
            0.3,
            audioContext.currentTime + 0.03
          );

          gain.gain.exponentialRampToValueAtTime(
            0.001,
            audioContext.currentTime + 0.35
          );

          oscillator.start();

          oscillator.stop(
            audioContext.currentTime + 0.35
          );

          await new Promise((resolve) =>
            setTimeout(resolve, 450)
          );
        }
      } catch (error) {
        console.log(
          "Ses oynatılamadı:",
          error
        );
      } finally {
        if (audioContext) {
          setTimeout(() => {
            audioContext?.close();
          }, 500);
        }
      }
    }

    playNotificationSound();

    return () => {
      cancelled = true;

      if (audioContext) {
        audioContext.close().catch(() => {});
      }
    };
  }, [newOrders]);

  // --------------------------------------------------
  // BİLDİRİMLERİ AÇ
  // --------------------------------------------------

  async function enableNotifications() {
    if (
      typeof Notification === "undefined"
    ) {
      alert(
        "Bu tarayıcı bildirimleri desteklemiyor."
      );
      return;
    }

    try {
      const permission =
        await Notification.requestPermission();

      if (permission === "granted") {
        setNotificationEnabled(true);

        new Notification(
          "🔔 Bildirimler Açıldı",
          {
            body:
              "Yeni sipariş geldiğinde sizi bilgilendireceğiz.",
            icon: "/favicon.ico",
          }
        );
      } else {
        setNotificationEnabled(false);

        alert(
          "Bildirim izni verilmedi. Tarayıcı ayarlarından bildirimlere izin verebilirsiniz."
        );
      }
    } catch (error) {
      console.error(
        "Bildirim izni alınamadı:",
        error
      );
    }
  }

  // --------------------------------------------------
  // UYARIYI KAPAT
  // --------------------------------------------------

  function dismissOrder(orderId: number) {
    setNewOrders((current) =>
      current.filter(
        (id) => id !== orderId
      )
    );
  }

  function dismissAllOrders() {
    setNewOrders([]);
  }

  // --------------------------------------------------
  // EKRAN
  // --------------------------------------------------

  return (
    <>
      {/* BİLDİRİM BUTONU */}

      <button
        onClick={enableNotifications}
        style={{
          marginBottom: "20px",
          padding: "10px 16px",
          borderRadius: "10px",
          border: "1px solid #ddd",
          background: notificationEnabled
            ? "#e8f5e9"
            : "white",
          color: "#111",
          cursor: "pointer",
          fontWeight: 600,
        }}
      >
        {notificationEnabled
          ? "🔔 Bildirimler Açık"
          : "🔔 Bildirimleri Aç"}
      </button>

      {/* YENİ SİPARİŞ UYARILARI */}

      {newOrders.length > 0 && (
        <div
          style={{
            position: "fixed",
            top: "20px",
            right: "20px",
            zIndex: 99999,
            width: "340px",
            maxWidth:
              "calc(100vw - 40px)",
          }}
        >
          <div
            style={{
              background: "#111",
              color: "white",
              padding: "20px",
              borderRadius: "16px",
              boxShadow:
                "0 15px 40px rgba(0,0,0,0.35)",
              border:
                "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <div
              style={{
                fontSize: "20px",
                fontWeight: 800,
                marginBottom: "8px",
              }}
            >
              🔔 Yeni Sipariş!
            </div>

            <div
              style={{
                fontSize: "14px",
                opacity: 0.8,
                marginBottom: "15px",
              }}
            >
              {newOrders.length === 1
                ? "Yeni bir müşteri siparişi geldi."
                : `${newOrders.length} yeni sipariş geldi.`}
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                marginBottom: "15px",
              }}
            >
              {newOrders.map(
                (orderId) => (
                  <div
                    key={orderId}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent:
                        "space-between",
                      padding: "10px 12px",
                      borderRadius: "10px",
                      background:
                        "rgba(255,255,255,0.08)",
                    }}
                  >
                    <strong>
                      Sipariş #{orderId}
                    </strong>

                    <button
                      type="button"
                      onClick={() =>
                        dismissOrder(
                          orderId
                        )
                      }
                      style={{
                        border: "none",
                        background:
                          "rgba(255,255,255,0.15)",
                        color: "white",
                        borderRadius: "8px",
                        padding:
                          "6px 10px",
                        cursor: "pointer",
                        fontWeight: 700,
                      }}
                    >
                      Gördüm
                    </button>
                  </div>
                )
              )}
            </div>

            <button
              type="button"
              onClick={dismissAllOrders}
              style={{
                width: "100%",
                padding: "11px",
                borderRadius: "10px",
                border: "none",
                background: "white",
                color: "#111",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Tüm Siparişleri Gördüm
            </button>
          </div>
        </div>
      )}
    </>
  );
}