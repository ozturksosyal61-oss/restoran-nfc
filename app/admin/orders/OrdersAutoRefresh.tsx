"use client";

import { useEffect, useRef, useState } from "react";
import AdminIcon from "../AdminIcon";
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
        .select("*")
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
                `Yeni bir sipariş geldi. Sipariş No: #${data.daily_number ?? currentOrderId}`,
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
    <div className="adm-notify" aria-live="polite">
      {newOrders.length > 0 && (
        <section className="adm-notify-panel" aria-label="Yeni siparişler">
          <div className="adm-notify-head">
            <span className="adm-notify-icon">
              <AdminIcon name="bell" size={17} />
            </span>
            <span>
              <strong>
                {newOrders.length === 1 ? "Yeni sipariş geldi" : `${newOrders.length} yeni sipariş`}
              </strong>
              <small>Panoda &quot;Yeni&quot; sütununda</small>
            </span>
          </div>

          <ul>
            {newOrders.map((orderId) => (
              <li key={orderId}>
                <span>Sipariş #{orderId}</span>
                <button type="button" onClick={() => dismissOrder(orderId)}>
                  Gördüm
                </button>
              </li>
            ))}
          </ul>

          {newOrders.length > 1 && (
            <button type="button" className="adm-notify-all" onClick={dismissAllOrders}>
              Tümünü gördüm
            </button>
          )}
        </section>
      )}

      <button
        type="button"
        className={`adm-notify-toggle ${notificationEnabled ? "is-on" : ""}`}
        onClick={enableNotifications}
        aria-pressed={notificationEnabled}
        title="Yeni siparişte tarayıcı bildirimi gönder"
      >
        <AdminIcon name="bell" size={16} />
        {notificationEnabled ? "Bildirimler açık" : "Bildirimleri aç"}
      </button>
    </div>
  );
}
