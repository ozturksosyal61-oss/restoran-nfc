"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AdminIcon from "../AdminIcon";
import { useBoardSignal } from "../../../lib/board-signal";
import type { Floor, FloorStatus, FloorTable } from "../../../lib/floor";
import styles from "./salon.module.css";

// Canlı masa haritası. Masa durumu sipariş, çağrı ve ödeme verisinden
// hesaplanır; anlık sinyal gelince (ya da yedek olarak aralıklarla) yenilenir.

const LIVE_REFRESH_MS = 30000;
const FALLBACK_REFRESH_MS = 6000;

export const STATUS_TEXT: Record<FloorStatus, string> = {
  bos: "Boş",
  dolu: "Dolu",
  siparis: "Yeni sipariş",
  hazir: "Sipariş hazır",
  cagri: "Garson çağırıyor",
  hesap: "Hesap istiyor",
  odendi: "Ödendi",
};

const STATUS_ORDER: FloorStatus[] = ["hesap", "cagri", "hazir", "siparis", "dolu", "odendi", "bos"];

const ORDER_STATUS_TEXT: Record<string, string> = {
  pending: "Yeni",
  accepted: "Kabul edildi",
  preparing: "Hazırlanıyor",
  ready: "Hazır",
  delivered: "Teslim edildi",
};

function money(value: number) {
  return `₺${value.toLocaleString("tr-TR", { maximumFractionDigits: 2 })}`;
}

function minutesSince(iso: string | null, now: number) {
  if (!iso) return 0;
  return Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000));
}

function elapsedText(iso: string | null, now: number) {
  const minutes = minutesSince(iso, now);
  if (minutes < 1) return "şimdi";
  if (minutes < 60) return `${minutes} dk`;
  return `${Math.floor(minutes / 60)} sa ${minutes % 60} dk`;
}

function TableTile({ table, now, selected, onSelect }: { table: FloorTable; now: number; selected: boolean; onSelect: () => void }) {
  const call = table.requests[table.requests.length - 1];
  const sinceText =
    table.status === "cagri" || table.status === "hesap"
      ? elapsedText(call?.lastCalledAt ?? call?.createdAt ?? null, now)
      : table.openedAt
        ? elapsedText(table.openedAt, now)
        : "";

  return (
    <button
      type="button"
      className={`${styles.table} ${styles[`shape_${table.shape}`]} ${styles[`status_${table.status}`]} ${selected ? styles.selected : ""}`}
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`Masa ${table.number}, ${STATUS_TEXT[table.status]}${table.due > 0 ? `, açık hesap ${money(table.due)}` : ""}`}
    >
      <span className={styles.tableNumber}>{table.number}</span>
      <span className={styles.tableStatus}>{STATUS_TEXT[table.status]}</span>
      {(sinceText || table.due > 0) && (
        <span className={styles.tableMeta}>
          {sinceText && <span>{sinceText}</span>}
          {table.due > 0 && <strong>{money(table.due)}</strong>}
        </span>
      )}
      <span className={styles.seats} aria-hidden="true">{table.seats} kişilik</span>
    </button>
  );
}

function TablePanel({
  table,
  now,
  canAct,
  busy,
  onAct,
  onClose,
}: {
  table: FloorTable;
  now: number;
  canAct: boolean;
  busy: boolean;
  onAct: (action: string, id: number, confirmText?: string) => void;
  onClose: () => void;
}) {
  return (
    <div className={styles.panelRoot} role="dialog" aria-modal="true" aria-labelledby="masa-panel-baslik">
      <button type="button" className={styles.backdrop} onClick={onClose} aria-label="Kapat" tabIndex={-1} />
      <aside className={styles.panel}>
        <header className={styles.panelHead}>
          <div>
            <span className={`${styles.statusPill} ${styles[`status_${table.status}`]}`}>{STATUS_TEXT[table.status]}</span>
            <h2 id="masa-panel-baslik">Masa {table.number}</h2>
            <small>
              {table.seats} kişilik
              {table.zone ? ` · ${table.zone}` : ""}
              {table.openedAt ? ` · ${elapsedText(table.openedAt, now)} önce açıldı` : ""}
            </small>
          </div>
          <button type="button" className="adm-btn adm-btn-sm" onClick={onClose} aria-label="Kapat">
            <AdminIcon name="close" size={16} />
          </button>
        </header>

        {table.requests.length > 0 && (
          <section className={styles.panelSection}>
            <h3>Çağrılar</h3>
            {table.requests.map((request) => (
              <div key={request.id} className={styles.requestRow}>
                <span>
                  <strong>{request.type === "hesap" ? "Hesap istiyor" : "Garson çağırıyor"}</strong>
                  <small>
                    {elapsedText(request.createdAt, now)} önce
                    {request.lastCalledAt ? ` · tekrar: ${elapsedText(request.lastCalledAt, now)} önce` : ""}
                  </small>
                </span>
                {canAct && (
                  <button
                    type="button"
                    className="adm-btn adm-btn-sm adm-btn-primary"
                    disabled={busy}
                    onClick={() => onAct("request:done", request.id)}
                  >
                    Tamamlandı
                  </button>
                )}
              </div>
            ))}
          </section>
        )}

        {table.sessionId === null ? (
          <p className={styles.emptyNote}>Bu masada açık hesap yok.</p>
        ) : (
          <>
            <section className={styles.panelSection}>
              <h3>Hesap</h3>
              <dl className={styles.totals}>
                <div>
                  <dt>Toplam</dt>
                  <dd>{money(table.total)}</dd>
                </div>
                {table.onlinePaid > 0 && (
                  <div>
                    <dt>Kartla ödenen</dt>
                    <dd>{money(table.onlinePaid)}</dd>
                  </div>
                )}
                <div>
                  <dt>Kalan</dt>
                  <dd className={table.due > 0 ? styles.due : ""}>{money(table.due)}</dd>
                </div>
              </dl>
            </section>

            <section className={styles.panelSection}>
              <h3>Siparişler</h3>
              {table.orders.length === 0 && <p className={styles.emptyNote}>Henüz sipariş yok.</p>}
              {table.orders.map((order) => (
                <article key={order.id} className={styles.orderCard}>
                  <header>
                    <strong>#{order.number}</strong>
                    <span className={styles.orderStatus}>{ORDER_STATUS_TEXT[order.status] ?? order.status}</span>
                    <span className={styles.orderTotal}>{money(order.total)}</span>
                  </header>
                  <ul>
                    {order.items.map((item, index) => (
                      <li key={`${item.name}-${index}`}>
                        <b>{item.quantity}×</b> {item.name}
                      </li>
                    ))}
                  </ul>
                  {canAct && order.status === "pending" && (
                    <button type="button" className="adm-btn adm-btn-sm" disabled={busy} onClick={() => onAct("order:accept", order.id)}>
                      Kabul et
                    </button>
                  )}
                  {canAct && order.status === "ready" && (
                    <button type="button" className="adm-btn adm-btn-sm adm-btn-primary" disabled={busy} onClick={() => onAct("order:deliver", order.id)}>
                      Teslim edildi
                    </button>
                  )}
                </article>
              ))}
            </section>

            {canAct && (
              <button
                type="button"
                className="adm-btn adm-btn-block"
                disabled={busy}
                onClick={() =>
                  onAct(
                    "session:close",
                    table.sessionId!,
                    table.due > 0
                      ? `Masa ${table.number} hesabı kapatılsın mı? Kalan ${money(table.due)} ödendi sayılacak.`
                      : `Masa ${table.number} hesabı kapatılsın mı?`
                  )
                }
              >
                <AdminIcon name="check" size={16} />
                Hesabı kapat, masayı boşalt
              </button>
            )}
          </>
        )}

        <a className={styles.panelLink} href="/admin/orders">
          Siparişler sayfasında aç
          <AdminIcon name="external" size={14} />
        </a>
      </aside>
    </div>
  );
}

export default function FloorView({
  initialFloor,
  restaurantId,
  canAct,
}: {
  initialFloor: Floor;
  restaurantId: number;
  canAct: boolean;
}) {
  const [floor, setFloor] = useState(initialFloor);
  const [zone, setZone] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);
  const [online, setOnline] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/salon", { cache: "no-store" });
      const result = (await response.json()) as { ok: boolean; floor?: Floor };
      if (!result.ok || !result.floor) throw new Error("salon");
      setFloor(result.floor);
      setOnline(true);
    } catch {
      setOnline(false);
    }
  }, []);

  const live = useBoardSignal(restaurantId, refresh);

  useEffect(() => {
    const timer = window.setInterval(() => void refresh(), live ? LIVE_REFRESH_MS : FALLBACK_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [refresh, live]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (selectedId === null) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setSelectedId(null);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [selectedId]);

  const shown = useMemo(
    () => (zone ? floor.tables.filter((table) => table.zone === zone) : floor.tables),
    [floor.tables, zone]
  );

  const counts = useMemo(() => {
    const map = new Map<FloorStatus, number>();
    for (const table of floor.tables) map.set(table.status, (map.get(table.status) ?? 0) + 1);
    return STATUS_ORDER.filter((status) => map.get(status)).map((status) => ({ status, count: map.get(status)! }));
  }, [floor.tables]);

  // Bölümdeki tüm masaların konumu girilmişse salon yerleşimi, değilse ızgara.
  const placed = shown.length > 0 && shown.every((table) => table.x !== null && table.y !== null);
  const selected = floor.tables.find((table) => table.id === selectedId) ?? null;

  async function act(action: string, id: number, confirmText?: string) {
    if (busy) return;
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true);
    try {
      const response = await fetch("/api/salon/islem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, id }),
      });
      const result = (await response.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
      setToast({ ok: Boolean(result?.ok), text: result?.message || (result?.ok ? "Güncellendi." : "İşlem yapılamadı.") });
      if (action === "session:close" && result?.ok) setSelectedId(null);
      await refresh();
    } catch {
      setToast({ ok: false, text: "Bağlantı hatası. Lütfen tekrar deneyin." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.toolbar}>
        {floor.zones.length > 0 && (
          <div className={styles.zones} role="tablist" aria-label="Bölümler">
            <button type="button" role="tab" aria-selected={zone === null} className={zone === null ? styles.zoneOn : ""} onClick={() => setZone(null)}>
              Tümü
            </button>
            {floor.zones.map((item) => (
              <button key={item} type="button" role="tab" aria-selected={zone === item} className={zone === item ? styles.zoneOn : ""} onClick={() => setZone(item)}>
                {item}
              </button>
            ))}
          </div>
        )}
        <div className={styles.summary} aria-live="polite">
          {counts.map(({ status, count }) => (
            <span key={status} className={`${styles.summaryItem} ${styles[`status_${status}`]}`}>
              <i aria-hidden="true" />
              {STATUS_TEXT[status]} <b>{count}</b>
            </span>
          ))}
          <span className={`${styles.live} ${online ? "" : styles.liveOff}`}>{online ? (live ? "Canlı" : "Güncelleniyor") : "Bağlantı yok"}</span>
        </div>
      </div>

      {shown.length === 0 ? (
        <div className="adm-empty">
          <span className="adm-empty-icon">
            <AdminIcon name="table" />
          </span>
          <strong>Masa bulunamadı</strong>
          <p>Masalarınızı &quot;Masalar&quot; sayfasından ekleyebilirsiniz.</p>
        </div>
      ) : placed ? (
        <div className={styles.canvas}>
          {shown.map((table) => (
            <div key={table.id} className={styles.placed} style={{ left: `${table.x}%`, top: `${table.y}%` }}>
              <TableTile table={table} now={now} selected={table.id === selectedId} onSelect={() => setSelectedId(table.id)} />
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.grid}>
          {shown.map((table) => (
            <TableTile key={table.id} table={table} now={now} selected={table.id === selectedId} onSelect={() => setSelectedId(table.id)} />
          ))}
        </div>
      )}

      {selected && (
        <TablePanel table={selected} now={now} canAct={canAct} busy={busy} onAct={act} onClose={() => setSelectedId(null)} />
      )}

      {toast && (
        <p className={`${styles.toast} ${toast.ok ? styles.toastOk : styles.toastError}`} role={toast.ok ? "status" : "alert"}>
          {toast.text}
        </p>
      )}
    </div>
  );
}
