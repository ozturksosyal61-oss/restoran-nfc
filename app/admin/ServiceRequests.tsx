"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "../../lib/supabase/client";
import AdminIcon from "./AdminIcon";

type ServiceRequest = {
  id: number;
  restaurant_id: number;
  table_id: number;
  request_type: string;
  status: string;
  created_at: string;
  completed_at: string | null;
  restaurant_tables:
    | {
        table_number: number;
      }
    | {
        table_number: number;
      }[]
    | null;
};

type Props = {
  restaurantId: number;
};

const requestLabels: Record<string, string> = {
  garson: "Garson çağırıyor",
  hesap: "Hesap istiyor",
  su: "Su istiyor",
  servis: "Servis istiyor",
  yardim: "Yardım istiyor",
};

function getTableNumber(request: ServiceRequest) {
  const table = Array.isArray(request.restaurant_tables)
    ? request.restaurant_tables[0]
    : request.restaurant_tables;

  return table?.table_number ?? "-";
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getWaitingSeconds(createdAt: string, now: number) {
  return Math.max(
    0,
    Math.floor(
      (now - new Date(createdAt).getTime()) / 1000
    )
  );
}

function formatWaitingTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(
    remainingSeconds
  ).padStart(2, "0")}`;
}

export default function ServiceRequests({
  restaurantId,
}: Props) {
  const supabase = createClient();

  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [soundEnabled, setSoundEnabled] = useState(false);

  const knownRequestIds = useRef<Set<number>>(new Set());
  const audioContextRef = useRef<AudioContext | null>(null);
  const firstLoadRef = useRef(true);

  /*
   * IMPORTANT:
   * Realtime callback'inin her zaman güncel ses durumunu
   * görmesi için state'e ek olarak ref kullanıyoruz.
   */
  const soundEnabledRef = useRef(false);

  /*
   * =====================================================
   * SESİ ETKİNLEŞTİR
   * =====================================================
   */

  async function enableNotificationSound() {
    try {
      const AudioContextClass =
        window.AudioContext ||
        (
          window as typeof window & {
            webkitAudioContext?: typeof AudioContext;
          }
        ).webkitAudioContext;

      if (!AudioContextClass) {
        setError(
          "Tarayıcınız ses bildirimini desteklemiyor."
        );

        return;
      }

      if (!audioContextRef.current) {
        audioContextRef.current =
          new AudioContextClass();
      }

      const context =
        audioContextRef.current;

      if (context.state === "suspended") {
        await context.resume();
      }

      const enabled =
        context.state === "running";

      soundEnabledRef.current =
        enabled;

      setSoundEnabled(enabled);

      if (!enabled) {
        setError(
          "Bildirim sesi etkinleşmedi. Tarayıcı ses izinlerini kontrol edin."
        );

        return;
      }

      /*
       * Kullanıcı "Sesi Aç" butonuna bastığında
       * kısa test sesi çal.
       */
      const oscillator =
        context.createOscillator();

      const gain =
        context.createGain();

      oscillator.type = "sine";

      oscillator.frequency.setValueAtTime(
        880,
        context.currentTime
      );

      oscillator.frequency.setValueAtTime(
        660,
        context.currentTime + 0.12
      );

      gain.gain.setValueAtTime(
        0.0001,
        context.currentTime
      );

      gain.gain.exponentialRampToValueAtTime(
        0.18,
        context.currentTime + 0.02
      );

      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        context.currentTime + 0.45
      );

      oscillator.connect(gain);
      gain.connect(
        context.destination
      );

      oscillator.start();

      oscillator.stop(
        context.currentTime + 0.45
      );
    } catch (soundError) {
      console.error(
        "Bildirim sesi etkinleştirilemedi:",
        soundError
      );

      soundEnabledRef.current = false;
      setSoundEnabled(false);

      setError(
        "Bildirim sesi etkinleştirilemedi. Tarayıcı ses izinlerini kontrol edin."
      );
    }
  }

  /*
   * =====================================================
   * BİLDİRİM SESİ ÇAL
   * =====================================================
   */

  async function playNotificationSound() {
    /*
     * Burada state yerine REF kullanıyoruz.
     * Böylece Realtime callback eski state değerini
     * kullanmayacak.
     */
    if (!soundEnabledRef.current) {
      return;
    }

    try {
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

      if (!audioContextRef.current) {
        audioContextRef.current =
          new AudioContextClass();
      }

      const context =
        audioContextRef.current;

      if (context.state === "suspended") {
        await context.resume();
      }

      if (context.state !== "running") {
        return;
      }

      const oscillator =
        context.createOscillator();

      const gain =
        context.createGain();

      oscillator.type = "sine";

      /*
       * Çift tonlu kısa bildirim.
       */
      oscillator.frequency.setValueAtTime(
        880,
        context.currentTime
      );

      oscillator.frequency.setValueAtTime(
        660,
        context.currentTime + 0.12
      );

      gain.gain.setValueAtTime(
        0.0001,
        context.currentTime
      );

      gain.gain.exponentialRampToValueAtTime(
        0.18,
        context.currentTime + 0.02
      );

      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        context.currentTime + 0.45
      );

      oscillator.connect(gain);
      gain.connect(
        context.destination
      );

      oscillator.start();

      oscillator.stop(
        context.currentTime + 0.45
      );
    } catch (soundError) {
      console.error(
        "Bildirim sesi oynatılamadı:",
        soundError
      );
    }
  }

  /*
   * =====================================================
   * ÇAĞRILARI YÜKLE
   * =====================================================
   */

  async function loadRequests(
    playSoundForNewRequests = false
  ) {
    setError("");

    const {
      data,
      error: loadError,
    } = await supabase
      .from("service_requests")
      .select(
        `
          id,
          restaurant_id,
          table_id,
          request_type,
          status,
          created_at,
          completed_at,
          restaurant_tables (
            table_number
          )
        `
      )
      .eq(
        "restaurant_id",
        restaurantId
      )
      .in("status", [
        "pending",
        "acknowledged",
      ])
      .order("created_at", {
        ascending: true,
      });

    if (loadError) {
      console.error(
        "Garson çağrıları yüklenemedi:",
        loadError
      );

      setError(
        "Garson çağrıları yüklenemedi: " +
          loadError.message
      );

      setLoading(false);

      return;
    }

    const nextRequests =
      (data || []) as ServiceRequest[];

    /*
     * İlk sayfa yüklenirken ses çalma.
     *
     * Sonraki INSERT olaylarında yeni ID varsa
     * bildirim sesi çal.
     */
    if (
      !firstLoadRef.current &&
      playSoundForNewRequests
    ) {
      const hasNewRequest =
        nextRequests.some(
          (request) =>
            !knownRequestIds.current.has(
              request.id
            )
        );

      if (hasNewRequest) {
        await playNotificationSound();
      }
    }

    knownRequestIds.current =
      new Set(
        nextRequests.map(
          (request) => request.id
        )
      );

    setRequests(nextRequests);
    setLoading(false);
    firstLoadRef.current = false;
  }

  /*
   * =====================================================
   * REALTIME + ZAMANLAYICI
   * =====================================================
   */

  useEffect(() => {
    void loadRequests();

    const timer =
      window.setInterval(() => {
        setNow(Date.now());
      }, 1000);

    const channel = supabase
      .channel(
        `service-requests-${restaurantId}`
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "service_requests",
          filter:
            `restaurant_id=eq.${restaurantId}`,
        },
        async (payload) => {
          /*
           * Yeni çağrı geldiğinde:
           * 1) veriyi yeniden al
           * 2) yeni kayıt varsa ses çal
           */
          if (
            payload.eventType ===
            "INSERT"
          ) {
            await loadRequests(true);
          } else {
            await loadRequests(false);
          }
        }
      )
      .subscribe();

    return () => {
      window.clearInterval(timer);

      supabase.removeChannel(channel);

      if (audioContextRef.current) {
        void audioContextRef.current.close();
        audioContextRef.current = null;
      }

      soundEnabledRef.current = false;
      setSoundEnabled(false);
    };
  }, [restaurantId]);

  /*
   * =====================================================
   * SEKME BAŞLIĞI
   * =====================================================
   */

  useEffect(() => {
    if (requests.length > 0) {
      document.title =
        `(${requests.length}) Garson Çağrısı • OZT`;
    } else {
      document.title =
        "OZT Digital Menü";
    }

    return () => {
      document.title =
        "OZT Digital Menü";
    };
  }, [requests.length]);

  /*
   * =====================================================
   * ÇAĞRIYI TAMAMLA
   * =====================================================
   */

  async function completeRequest(
    requestId: number
  ) {
    setUpdatingId(requestId);
    setError("");

    const {
      error: updateError,
    } = await supabase
      .from("service_requests")
      .update({
        status: "completed",
        completed_at:
          new Date().toISOString(),
      })
      .eq("id", requestId)
      .eq(
        "restaurant_id",
        restaurantId
      );

    if (updateError) {
      console.error(
        "Garson çağrısı tamamlanamadı:",
        updateError
      );

      setError(
        "Çağrı tamamlanamadı: " +
          updateError.message
      );

      setUpdatingId(null);

      return;
    }

    setRequests((current) =>
      current.filter(
        (request) =>
          request.id !== requestId
      )
    );

    knownRequestIds.current.delete(
      requestId
    );

    setUpdatingId(null);
  }

  /*
   * =====================================================
   * GÖRÜNÜM
   * =====================================================
   */

  return (
    <section className="adm-card" aria-labelledby="cagri-baslik" aria-live="polite">
      <div className="adm-card-head">
        <div>
          <h2 id="cagri-baslik">
            Masa çağrıları{requests.length > 0 ? ` · ${requests.length}` : ""}
          </h2>
          <p>Garson ve hesap istekleri anlık gelir; tamamlananlar listeden düşer.</p>
        </div>
        <button
          type="button"
          className={`adm-btn adm-btn-sm ${soundEnabled ? "adm-btn-ok" : ""}`}
          onClick={enableNotificationSound}
          aria-pressed={soundEnabled}
        >
          <AdminIcon name="bell" size={15} />
          {soundEnabled ? "Ses açık" : "Sesi aç"}
        </button>
      </div>

      {error && (
        <p className="adm-alert adm-alert-error" role="alert">
          <AdminIcon name="alert" size={16} />
          {error}
        </p>
      )}

      {loading ? (
        <p className="adm-hint" style={{ margin: 0 }}>Çağrılar yükleniyor…</p>
      ) : requests.length === 0 ? (
        <div className="adm-empty" style={{ padding: "24px 16px" }}>
          <span className="adm-empty-icon"><AdminIcon name="check" /></span>
          <strong>Bekleyen çağrı yok</strong>
          <p>Bir masa garson çağırdığında ya da hesap istediğinde burada görünür.</p>
        </div>
      ) : (
        <div className="adm-calls">
          {requests.map((request) => {
            const seconds = getWaitingSeconds(request.created_at, now);
            const late = seconds >= 180;
            const isBill = request.request_type === "hesap";

            return (
              <article key={request.id} className={`adm-call ${late ? "is-late" : ""}`}>
                <span className={`adm-call-icon ${isBill ? "is-bill" : ""}`}>
                  <AdminIcon name={isBill ? "orders" : "bell"} />
                </span>
                <span className="adm-call-main">
                  <strong>Masa {getTableNumber(request)}</strong>
                  <small>
                    {requestLabels[request.request_type] || "Çağırıyor"} · {formatTime(request.created_at)}
                  </small>
                </span>
                <span className={`adm-call-wait ${late ? "is-late" : ""}`} title="Bekleme süresi">
                  {formatWaitingTime(seconds)}
                </span>
                <button
                  type="button"
                  className="adm-btn adm-btn-sm adm-btn-primary"
                  onClick={() => completeRequest(request.id)}
                  disabled={updatingId === request.id}
                >
                  <AdminIcon name="check" size={15} />
                  {updatingId === request.id ? "Kaydediliyor…" : "Tamamlandı"}
                </button>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
