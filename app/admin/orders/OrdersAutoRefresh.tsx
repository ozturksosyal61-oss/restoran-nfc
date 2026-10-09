"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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

type NewOrder = { id: number; number: number };

export default function OrdersAutoRefresh({
  restaurantId,
}: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [newOrders, setNewOrders] = useState<NewOrder[]>([]);
  // Yalnızca yeni sipariş gelince artar; "Gördüm" demek sesi tekrar çaldırmaz.
  const [alertTick, setAlertTick] = useState(0);
  const [notificationEnabled, setNotificationEnabled] =
    useState(false);

  const lastOrderId = useRef<number | null>(null);
  const firstCheck = useRef(true);
  const mountedRef = useRef(true);
  const checkingRef = useRef(false);

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
        current.filter((order) => order.id !== orderId)
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

  // Panodaki veriyi sayfayı yeniden yüklemeden tazeler.
  const refreshBoard = useCallback(() => {
    startTransition(() => router.refresh());
  }, [router]);

  // Yeni sipariş var mı bakar; varsa uyarı verir ve panoyu tazeler.
  // refreshAnyway: anlık sinyal geldiyse (durum değişikliği de olabilir)
  // yeni sipariş olmasa da pano tazelenir.
  const checkOrders = useCallback(async (refreshAnyway = false) => {
    if (checkingRef.current) {
      return;
    }
    checkingRef.current = true;

    try {
      const supabase = createClient();

      // İlk kontrolde yalnızca en son sipariş kaydedilir.
      if (firstCheck.current) {
        const { data, error } = await supabase
          .from("orders")
          .select("id")
          .eq("restaurant_id", restaurantId)
          .order("id", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error("Sipariş kontrol hatası:", error);
          return;
        }

        lastOrderId.current = data ? Number(data.id) : 0;
        firstCheck.current = false;
        return;
      }

      const { data, error } = await supabase
        .from("orders")
        .select("id, daily_number")
        .eq("restaurant_id", restaurantId)
        .gt("id", lastOrderId.current ?? 0)
        .order("id", { ascending: true })
        .limit(20);

      if (error) {
        console.error("Sipariş kontrol hatası:", error);
        return;
      }

      if (!mountedRef.current) {
        return;
      }

      // ------------------------------------------------
      // YENİ SİPARİŞ GELDİ
      // ------------------------------------------------

      const arrived: NewOrder[] = (data ?? []).map((row) => ({
        id: Number(row.id),
        number: Number(row.daily_number ?? row.id),
      }));

      if (arrived.length > 0) {
        lastOrderId.current = arrived[arrived.length - 1].id;

        setNewOrders((current) => [
          ...current,
          ...arrived.filter((order) => !current.some((item) => item.id === order.id)),
        ]);
        setAlertTick((tick) => tick + 1);

        // Tarayıcı bildirimi
        if (
          typeof Notification !== "undefined" &&
          Notification.permission === "granted"
        ) {
          for (const order of arrived) {
            new Notification(
              "🔔 Yeni Sipariş!",
              {
                body:
                  `Yeni bir sipariş geldi. Sipariş No: #${order.number}`,
                icon: "/favicon.ico",
                // Telefona gelen bildirimle aynı etiket: aynı sipariş iki kez gösterilmez.
                tag: `order-${order.id}`,
              }
            );
          }
        }
      }

      if (arrived.length > 0 || refreshAnyway) {
        refreshBoard();
      }
    } finally {
      checkingRef.current = false;
    }
  }, [restaurantId, refreshBoard]);

  // Anlık sinyal: sipariş geldi ya da bir siparişin durumu değişti
  // (personel ekranından da olabilir); pano hemen tazelenir.
  const onBoardSignal = useCallback(() => {
    void checkOrders(true);
  }, [checkOrders]);

  // Yeni sipariş sinyali gelince hemen kontrol edilir.
  const live = useBoardSignal(restaurantId, onBoardSignal);

  useEffect(() => {
    // İlk kontrol
    void checkOrders();

    const interval = setInterval(
      () => void checkOrders(),
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
    if (alertTick === 0) {
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
  }, [alertTick]);

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
        (order) => order.id !== orderId
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
            {newOrders.map((order) => (
              <li key={order.id}>
                <span>Sipariş #{order.number}</span>
                <button type="button" onClick={() => dismissOrder(order.id)}>
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
