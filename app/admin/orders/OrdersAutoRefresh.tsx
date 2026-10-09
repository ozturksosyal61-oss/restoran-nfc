"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import AdminIcon from "../AdminIcon";
import { useBoardSignal } from "../../../lib/board-signal";
import { IOS_INSTALL_TEXT, enablePush, getPushState, refreshPush } from "../../../lib/push-client";
import { createClient } from "../../../lib/supabase/client";

// Anlık sinyal bağlıyken yalnızca yedek kontrol yapılır; bağlı değilken eskisi gibi sık kontrol.
const LIVE_CHECK_MS = 30000;
const FALLBACK_CHECK_MS = 2000;

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

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const checkOrders = useCallback(async () => {
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
            // Telefona gelen bildirimle aynı etiket: aynı sipariş iki kez gösterilmez.
            tag: `order-${currentOrderId}`,
          }
        );
      }

      lastOrderId.current = currentOrderId;

      // Önce Server Component'in yenilenmesini dene
      window.location.reload();
    }
  }, [restaurantId]);

  // Yeni sipariş sinyali gelince hemen kontrol edilir.
  const live = useBoardSignal(restaurantId, checkOrders);

  useEffect(() => {
    // İlk kontrol
    void checkOrders();

    const interval = setInterval(
      checkOrders,
      live ? LIVE_CHECK_MS : FALLBACK_CHECK_MS
    );

    return () => {
      clearInterval(interval);
    };
  }, [checkOrders, live]);

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

  // İzin daha önce verildiyse düğme açık görünür ve telefon kaydı tazelenir.
  useEffect(() => {
    if (
      typeof Notification === "undefined" ||
      Notification.permission !== "granted"
    ) {
      return;
    }

    void refreshPush().then(() => setNotificationEnabled(true));
  }, []);

  async function enableNotifications() {
    if (
      typeof Notification === "undefined"
    ) {
      const state = await getPushState();
      alert(
        state === "ios-install"
          ? IOS_INSTALL_TEXT
          : "Bu tarayıcı bildirimleri desteklemiyor."
      );
      return;
    }

    try {
      const permission =
        await Notification.requestPermission();

      if (permission === "granted") {
        setNotificationEnabled(true);

        // Telefon kilitliyken de bildirim gelsin (destekleyen cihazlarda).
        const push = await enablePush();
        if (!push.ok) {
          console.log("Telefon bildirimi açılamadı:", push.message);
        }

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
