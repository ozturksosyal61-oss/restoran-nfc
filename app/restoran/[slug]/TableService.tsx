"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { createClient } from "../../../lib/supabase/client";
import { sendTableRequest, type TableRequestType } from "./aurora-utils";

// Garson çağırma ve hesap isteme: tüm müşteri ekranlarında (ana sayfa, menü,
// sipariş takibi, hesap) aynı durum. Durum sunucudan okunur
// (get_table_service_state, 20261104); sayfa yenilense de kaybolmaz.
//
// Aktif çağrı varken (bekliyor ya da görüldü) aynı tür 3 dakika boyunca
// yeniden gönderilemez; sonra "tekrar çağır" gönderilebilir (sunucu da
// tekrar bildirimini en erken 3 dakikada gönderir).

export const RECALL_AFTER_MS = 3 * 60 * 1000;
const REFRESH_MS = 20_000;

type ServiceRequest = {
  type: TableRequestType;
  status: "pending" | "acknowledged";
  created_at: string;
  last_called_at: string;
};

export type ServiceInfo = {
  active: boolean;
  // Çağrı personel tarafından görüldü mü?
  seen: boolean;
  // Son çağrıdan bu yana geçen dakika.
  minutes: number;
  canCall: boolean;
};

const CONFIRM: Record<TableRequestType, string> = {
  garson: "Garson çağrılsın mı?",
  hesap: "Hesap istensin mi?",
};

function useServiceState(restaurantId: number | null, token: string | null) {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [sending, setSending] = useState<TableRequestType | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const refresh = useCallback(async () => {
    if (!restaurantId || !token) return;
    const { data, error } = await createClient().rpc("get_table_service_state", {
      p_restaurant_id: restaurantId,
      p_public_token: token,
    });
    // Fonksiyon henüz yoksa (migration çalışmadıysa) durum boş kalır.
    if (!error && Array.isArray(data)) setRequests(data as ServiceRequest[]);
    setNow(Date.now());
  }, [restaurantId, token]);

  useEffect(() => {
    if (!restaurantId || !token) return;
    const first = window.setTimeout(refresh, 0);
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, REFRESH_MS);
    const onVisible = () => document.visibilityState === "visible" && void refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [restaurantId, token, refresh]);

  const info = useCallback(
    (type: TableRequestType): ServiceInfo => {
      const request = requests.find((item) => item.type === type);
      if (!request) return { active: false, seen: false, minutes: 0, canCall: true };
      const elapsed = now - new Date(request.last_called_at).getTime();
      return {
        active: true,
        seen: request.status === "acknowledged",
        minutes: Math.max(0, Math.floor(elapsed / 60_000)),
        canCall: elapsed >= RECALL_AFTER_MS,
      };
    },
    [requests, now]
  );

  // Onay sorulur, gönderilir ve durum yenilenir.
  // "skipped": vazgeçildi ya da henüz tekrar çağrılamaz.
  const request = useCallback(
    async (type: TableRequestType, confirmMessage?: string): Promise<"sent" | "failed" | "skipped"> => {
      if (!restaurantId || !token || sending) return "skipped";
      if (!info(type).canCall) return "skipped";
      if (!window.confirm(confirmMessage ?? CONFIRM[type])) return "skipped";

      setSending(type);
      const ok = await sendTableRequest(restaurantId, token, type);
      setSending(null);
      if (ok) {
        // Sunucu cevabını beklemeden ekranda hemen görünsün.
        const at = new Date().toISOString();
        setRequests((current) => [
          { type, status: "pending", created_at: at, last_called_at: at },
          ...current.filter((item) => item.type !== type),
        ]);
        setNow(Date.now());
        void refresh();
      }
      return ok ? "sent" : "failed";
    },
    [restaurantId, token, sending, info, refresh]
  );

  return { info, request, sending };
}

export type TableServiceApi = ReturnType<typeof useServiceState>;

const TableServiceContext = createContext<TableServiceApi | null>(null);

export function TableServiceProvider({
  restaurantId,
  token,
  children,
}: {
  restaurantId: number | null;
  token: string | null;
  children: ReactNode;
}) {
  const api = useServiceState(restaurantId, token);
  return <TableServiceContext.Provider value={api}>{children}</TableServiceContext.Provider>;
}

// Sağlayıcı varsa onu, yoksa kendi durumunu kullanır.
export function useTableService(restaurantId: number | null, token: string | null): TableServiceApi {
  const shared = useContext(TableServiceContext);
  const own = useServiceState(shared ? null : restaurantId, shared ? null : token);
  return shared ?? own;
}

// "Garson çağrıldı · 2 dk önce" / "Çağrınız görüldü · 1 dk önce"
export function serviceStatusText(type: TableRequestType, info: ServiceInfo) {
  const when = info.minutes < 1 ? "az önce" : `${info.minutes} dk önce`;
  if (info.seen) return `${type === "garson" ? "Çağrınız" : "Hesap isteğiniz"} görüldü · ${when}`;
  return `${type === "garson" ? "Garson çağrıldı" : "Hesap istendi"} · ${when}`;
}

// Ana sayfa tasarımlarının servis kartı. Sınıf adları ve simgeler tasarımdan gelir.
export function TableServiceCard({
  restaurantId,
  token,
  type,
  title,
  subtitle,
  icon,
  doneIcon,
  cardClass,
  doneClass,
  tileClass,
  textClass,
  iconInTitle = false,
}: {
  restaurantId: number;
  token: string;
  type: TableRequestType;
  title: string;
  subtitle: string;
  icon: ReactNode;
  doneIcon: ReactNode;
  cardClass: string;
  doneClass: string;
  tileClass?: string;
  // Varsa başlık ve alt yazı bu sınıfla sarılır (Luna).
  textClass?: string;
  // Simge başlığın içinde (Linen).
  iconInTitle?: boolean;
}) {
  const { info, request, sending } = useTableService(restaurantId, token);
  const state = info(type);
  const busy = sending === type;
  const done = state.active;

  const text = (
    <>
      <strong>
        {iconInTitle && (done ? doneIcon : icon)}
        {done ? (type === "garson" ? "Garson çağrıldı" : "Hesap istendi") : title}
      </strong>
      <small>
        {busy
          ? "Gönderiliyor…"
          : done
            ? `${serviceStatusText(type, state).split(" · ")[1]}${state.canCall ? " · tekrar çağırmak için dokunun" : ""}`
            : subtitle}
      </small>
    </>
  );

  return (
    <button
      type="button"
      className={`${cardClass} ${done ? doneClass : ""}`}
      onClick={() => void request(type)}
      disabled={busy || (done && !state.canCall)}
      aria-live="polite"
    >
      {!iconInTitle && <span className={tileClass}>{done ? doneIcon : icon}</span>}
      {textClass ? <span className={textClass}>{text}</span> : text}
    </button>
  );
}
