"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "../../lib/supabase/client";

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
  garson: "Garson Çağırıyor",
  hesap: "Hesap İstiyor",
  su: "Su İstiyor",
  servis: "Servis İstiyor",
  yardim: "Yardım İstiyor",
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
    Math.floor((now - new Date(createdAt).getTime()) / 1000)
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
        setError("Tarayıcınız ses bildirimini desteklemiyor.");
        return;
      }

      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContextClass();
      }

      const context = audioContextRef.current;

      if (context.state === "suspended") {
        await context.resume();
      }

      setSoundEnabled(context.state === "running");
    } catch (soundError) {
      console.error(
        "Bildirim sesi etkinleştirilemedi:",
        soundError
      );

      setError(
        "Bildirim sesi etkinleştirilemedi. Tarayıcı ses izinlerini kontrol edin."
      );
    }
  }

  async function playNotificationSound() {
    if (!soundEnabled) return;

    try {
      const AudioContextClass =
        window.AudioContext ||
        (
          window as typeof window & {
            webkitAudioContext?: typeof AudioContext;
          }
        ).webkitAudioContext;

      if (!AudioContextClass) return;

      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContextClass();
      }

      const context = audioContextRef.current;

      if (context.state === "suspended") {
        await context.resume();
      }

      const oscillator = context.createOscillator();
      const gain = context.createGain();

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(880, context.currentTime);
      oscillator.frequency.setValueAtTime(
        660,
        context.currentTime + 0.12
      );

      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(
        0.18,
        context.currentTime + 0.02
      );
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        context.currentTime + 0.45
      );

      oscillator.connect(gain);
      gain.connect(context.destination);

      oscillator.start();
      oscillator.stop(context.currentTime + 0.45);
    } catch (soundError) {
      console.error(
        "Bildirim sesi oynatılamadı:",
        soundError
      );
    }
  }

  async function loadRequests(
    playSoundForNewRequests = false
  ) {
    setError("");

    const { data, error: loadError } = await supabase
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
      .eq("restaurant_id", restaurantId)
      .in("status", ["pending", "acknowledged"])
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

    const nextRequests = (data || []) as ServiceRequest[];

    if (!firstLoadRef.current && playSoundForNewRequests) {
      const hasNewRequest = nextRequests.some(
        (request) => !knownRequestIds.current.has(request.id)
      );

      if (hasNewRequest) {
        await playNotificationSound();
      }
    }

    knownRequestIds.current = new Set(
      nextRequests.map((request) => request.id)
    );

    setRequests(nextRequests);
    setLoading(false);
    firstLoadRef.current = false;
  }

  useEffect(() => {
    loadRequests();

    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    const channel = supabase
      .channel(`service-requests-${restaurantId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "service_requests",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        async (payload) => {
          if (payload.eventType === "INSERT") {
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
    };
  }, [restaurantId]);

  useEffect(() => {
    if (requests.length > 0) {
      document.title = `(${requests.length}) Garson Çağrısı • OZT`;
    } else {
      document.title = "OZT Digital Menü";
    }

    return () => {
      document.title = "OZT Digital Menü";
    };
  }, [requests.length]);

  async function completeRequest(requestId: number) {
    setUpdatingId(requestId);
    setError("");

    const { error: updateError } = await supabase
      .from("service_requests")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", requestId)
      .eq("restaurant_id", restaurantId);

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
        (request) => request.id !== requestId
      )
    );

    knownRequestIds.current.delete(requestId);
    setUpdatingId(null);
  }

  if (loading) {
    return (
      <section
        style={{
          background: "white",
          borderRadius: "18px",
          padding: "22px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.05)",
        }}
      >
        <div className="dashboard-section-heading">
          <span>PERSONEL ÇAĞRILARI</span>
          <h2>Garson Çağrıları</h2>
        </div>

        <p
          style={{
            margin: 0,
            color: "#888",
            fontSize: "13px",
          }}
        >
          Çağrılar yükleniyor...
        </p>
      </section>
    );
  }

  return (
    <section
      style={{
        background: "white",
        borderRadius: "18px",
        padding: "22px",
        boxShadow: "0 10px 30px rgba(0,0,0,0.05)",
        minWidth: 0,
        position: "relative",
      }}
    >
      {requests.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "14px",
            right: "14px",
            width: "9px",
            height: "9px",
            borderRadius: "50%",
            background: "#b42318",
            boxShadow: "0 0 0 5px rgba(180,35,24,0.08)",
          }}
          aria-label="Bekleyen çağrı var"
        />
      )}

      <div
        className="dashboard-section-heading"
        style={{
          marginBottom: "18px",
          display: "flex",
          justifyContent: "space-between",
          gap: "12px",
          alignItems: "flex-start",
        }}
      >
        <div>
          <span>PERSONEL ÇAĞRILARI</span>
          <h2>Garson Çağrıları</h2>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <button
            type="button"
            onClick={enableNotificationSound}
            style={{
              border: "1px solid #e5dfd2",
              borderRadius: "9px",
              padding: "7px 9px",
              background: soundEnabled ? "#e8f5e9" : "white",
              color: soundEnabled ? "#2e7d32" : "#555",
              fontSize: "10px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {soundEnabled ? "🔊 Ses Açık" : "🔇 Sesi Aç"}
          </button>

          <div
            style={{
              minWidth: "28px",
              height: "28px",
              padding: "0 8px",
              borderRadius: "20px",
              display: "grid",
              placeItems: "center",
              background:
                requests.length > 0
                  ? "#fff3cd"
                  : "#f5f3ef",
              color:
                requests.length > 0
                  ? "#946b00"
                  : "#888",
              fontSize: "12px",
              fontWeight: 800,
            }}
          >
            {requests.length}
          </div>
        </div>
      </div>

      {error && (
        <p
          className="login-error"
          style={{
            marginBottom: "12px",
          }}
        >
          ❌ {error}
        </p>
      )}

      {requests.length === 0 ? (
        <div
          style={{
            padding: "28px 18px",
            textAlign: "center",
            border: "1px dashed #ddd4c3",
            borderRadius: "14px",
            background: "#faf8f3",
          }}
        >
          <div style={{ fontSize: "34px" }}>🔕</div>

          <h3
            style={{
              margin: "8px 0 5px",
            }}
          >
            Bekleyen çağrı yok
          </h3>

          <p
            style={{
              margin: 0,
              color: "#888",
              fontSize: "12px",
            }}
          >
            Yeni bir masa çağrısı geldiğinde burada
            anında görünecek.
          </p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gap: "10px",
          }}
        >
          {requests.map((request) => {
            const tableNumber = getTableNumber(request);
            const label =
              requestLabels[request.request_type] ||
              "Personel Talebi";
            const waitingSeconds = getWaitingSeconds(
              request.created_at,
              now
            );

            return (
              <div
                key={request.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "14px",
                  padding: "14px",
                  border:
                    waitingSeconds >= 180
                      ? "1px solid #e2b4af"
                      : "1px solid #eee3cb",
                  borderRadius: "13px",
                  background:
                    waitingSeconds >= 180
                      ? "#fff6f5"
                      : "#fffaf0",
                }}
              >
                <div
                  style={{
                    minWidth: 0,
                    flex: 1,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <span
                      style={{
                        width: "32px",
                        height: "32px",
                        flexShrink: 0,
                        display: "grid",
                        placeItems: "center",
                        borderRadius: "10px",
                        background:
                          waitingSeconds >= 180
                            ? "#fde3df"
                            : "#fff0bf",
                        fontSize: "15px",
                      }}
                    >
                      🔔
                    </span>

                    <div
                      style={{
                        minWidth: 0,
                      }}
                    >
                      <strong
                        style={{
                          display: "block",
                          fontSize: "13px",
                        }}
                      >
                        Masa {tableNumber}
                      </strong>

                      <span
                        style={{
                          display: "block",
                          marginTop: "2px",
                          color: "#666",
                          fontSize: "11px",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {label} · {formatTime(request.created_at)}
                      </span>
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: "9px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "5px 8px",
                      borderRadius: "8px",
                      background:
                        waitingSeconds >= 180
                          ? "#fde3df"
                          : "#f5f1e8",
                      color:
                        waitingSeconds >= 180
                          ? "#b42318"
                          : "#6d5a32",
                      fontSize: "10px",
                      fontWeight: 800,
                    }}
                  >
                    ⏱ {formatWaitingTime(waitingSeconds)} bekliyor
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    completeRequest(request.id)
                  }
                  disabled={updatingId === request.id}
                  style={{
                    flexShrink: 0,
                    border: "none",
                    borderRadius: "9px",
                    padding: "9px 12px",
                    background: "#111",
                    color: "white",
                    fontSize: "11px",
                    fontWeight: 700,
                    cursor:
                      updatingId === request.id
                        ? "not-allowed"
                        : "pointer",
                    opacity:
                      updatingId === request.id
                        ? 0.6
                        : 1,
                  }}
                >
                  {updatingId === request.id
                    ? "Tamamlanıyor..."
                    : "✓ Tamamlandı"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      <p
        style={{
          margin: "14px 0 0",
          color: "#999",
          fontSize: "11px",
        }}
      >
        Yeni çağrılar Realtime ile otomatik gelir; bekleme
        süresi canlı olarak güncellenir.
      </p>
    </section>
  );
}
