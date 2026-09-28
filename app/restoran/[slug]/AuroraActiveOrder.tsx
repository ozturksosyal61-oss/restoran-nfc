"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "../../../lib/supabase/client";
import styles from "./AuroraRestaurantHome.module.css";

type ActiveOrder = {
  id: number;
  status: string;
  itemCount: number;
  total: number;
  href: string;
};

const ActiveOrderContext = createContext<ActiveOrder | null>(null);

// Bu süreden eski siparişler "aktif" sayılmaz (tarayıcıda kalan eski kayıt).
const ACTIVE_WINDOW_MS = 8 * 60 * 60 * 1000;
const REFRESH_MS = 20_000;

// Sipariş sayfası son siparişi `ozt_last_order_{slug}_{masaKodu}` anahtarıyla saklar.
function findSavedOrder(slug: string, tableToken: string | null) {
  try {
    const prefix = `ozt_last_order_${slug}_`;
    const preferred = tableToken ? `${prefix}${tableToken}` : null;

    const keys = preferred ? [preferred] : [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(prefix) && key !== preferred) keys.push(key);
    }

    for (const key of keys) {
      const orderId = localStorage.getItem(key)?.trim() || "";
      if (/^\d+$/.test(orderId)) {
        return { orderId, token: key.slice(prefix.length) };
      }
    }
  } catch {
    // Tarayıcı depolaması kapalıysa aktif sipariş gösterilmez.
  }

  return null;
}

export function ActiveOrderProvider({
  slug,
  tableToken,
  children,
}: {
  slug: string;
  tableToken: string | null;
  children: ReactNode;
}) {
  const [order, setOrder] = useState<ActiveOrder | null>(null);

  useEffect(() => {
    const saved = findSavedOrder(slug, tableToken);
    if (!saved) return;

    const supabase = createClient();
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function load() {
      const { data } = await supabase.rpc("get_public_order", {
        p_order_id: Number(saved!.orderId),
        p_table_token: saved!.token,
      });

      if (cancelled) return;

      const found = data?.order;
      const tooOld =
        !found?.created_at ||
        Date.now() - new Date(found.created_at).getTime() > ACTIVE_WINDOW_MS;

      if (!found || tooOld || ["cancelled", "refunded"].includes(found.status)) {
        setOrder(null);
        return;
      }

      const items: { quantity?: number }[] = Array.isArray(data.items)
        ? data.items
        : [];

      setOrder({
        id: Number(found.id),
        status: String(found.status),
        itemCount: items.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
        total: Number(found.total_amount || 0),
        href: `/restoran/${slug}/siparis/takip/${found.id}?masa=${encodeURIComponent(saved!.token)}`,
      });

      if (found.status !== "delivered") {
        timer = setTimeout(load, REFRESH_MS);
      }
    }

    load();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [slug, tableToken]);

  return (
    <ActiveOrderContext.Provider value={order}>
      {children}
    </ActiveOrderContext.Provider>
  );
}

// Aşamalar paneldeki sipariş durumlarıyla eşleşir.
// fill: üç çubuğun (Alındı · Hazırlanıyor · Masanızda) doluluk oranı.
const STAGES: Record<string, { title: string; step: number; fill: number[] }> = {
  pending: { title: "Siparişiniz alındı", step: 0, fill: [0.5, 0, 0] },
  accepted: { title: "Siparişiniz onaylandı", step: 1, fill: [1, 0.15, 0] },
  preparing: { title: "Siparişiniz hazırlanıyor", step: 1, fill: [1, 0.55, 0] },
  ready: { title: "Siparişiniz hazır", step: 2, fill: [1, 1, 0.35] },
  delivered: { title: "Siparişiniz masanızda", step: 2, fill: [1, 1, 1] },
};

const STEP_LABELS = ["Alındı", "Hazırlanıyor", "Masanızda"];

export function ActiveOrderCard() {
  const order = useContext(ActiveOrderContext);
  if (!order) return null;

  const stage = STAGES[order.status] ?? STAGES.pending;
  const live = order.status !== "delivered";

  return (
    <a className={styles.orderCard} href={order.href}>
      <span className={styles.orderTop}>
        <span className={live ? styles.orderPulse : styles.orderDone} aria-hidden="true" />
        <span className={styles.orderText}>
          <strong>{stage.title}</strong>
          <small>
            #{order.id} · {order.itemCount} ürün · ₺
            {order.total.toLocaleString("tr-TR")}
          </small>
        </span>
        <span className={styles.orderLink}>
          Takip et
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </span>
      </span>

      <span className={styles.progress}>
        {STEP_LABELS.map((label, i) => (
          <span key={label} className={styles.progressStep}>
            <span className={styles.progressBar}>
              <span
                className={live && i === stage.step ? styles.progressFillLive : styles.progressFill}
                style={{ width: `${stage.fill[i] * 100}%` }}
              />
            </span>
            <span className={i === stage.step ? styles.progressLabelOn : styles.progressLabel}>
              {label}
            </span>
          </span>
        ))}
      </span>
    </a>
  );
}

// "Siparişim" sekmesi: aktif sipariş varsa takip ekranına gider ve rozet gösterir.
export function OrderTabLink({
  fallbackHref,
  className,
  badgeClassName,
  children,
}: {
  fallbackHref: string;
  className: string;
  badgeClassName: string;
  children: ReactNode;
}) {
  const order = useContext(ActiveOrderContext);
  const showBadge = order && order.status !== "delivered";

  return (
    <a href={order?.href ?? fallbackHref} className={className}>
      {children}
      {showBadge && (
        <span className={badgeClassName} aria-label="1 aktif sipariş">
          1
        </span>
      )}
    </a>
  );
}
