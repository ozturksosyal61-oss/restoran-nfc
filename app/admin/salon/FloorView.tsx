"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import AdminIcon from "../AdminIcon";
import { useBoardSignal } from "../../../lib/board-signal";
import type {
  Floor,
  FloorShape,
  FloorStatus,
  FloorTable,
} from "../../../lib/floor";
import styles from "./salon.module.css";

// Canlı masa haritası. Yönetici "Salon" sayfası ve garson ekranı ortak
// kullanır; veri ve işlem adresleri dışarıdan verilir. Masa durumu sipariş,
// çağrı ve ödeme verisinden hesaplanır; anlık sinyal gelince (ya da yedek
// olarak aralıklarla) yenilenir. layoutUrl verilirse (yönetici) yerleşim
// düzenlenebilir: sürükle-bırak, şekil, kişi sayısı, bölüm.

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

const STATUS_ORDER: FloorStatus[] = [
  "hesap",
  "cagri",
  "hazir",
  "siparis",
  "dolu",
  "odendi",
  "bos",
];

const SHAPE_TEXT: Record<FloorShape, string> = {
  kare: "Kare",
  yuvarlak: "Yuvarlak",
  uzun: "Uzun",
};

const ORDER_STATUS_TEXT: Record<string, string> = {
  pending: "Yeni",
  accepted: "Kabul edildi",
  preparing: "Hazırlanıyor",
  ready: "Hazır",
  delivered: "Teslim edildi",
};

type Draft = {
  shape: FloorShape;
  seats: number;
  x: number;
  y: number;
  zone: string | null;
};

function money(value: number) {
  return `₺${value.toLocaleString("tr-TR", { maximumFractionDigits: 2 })}`;
}

function elapsedText(iso: string | null, now: number) {
  if (!iso) return "";
  const minutes = Math.max(
    0,
    Math.floor((now - new Date(iso).getTime()) / 60000),
  );
  if (minutes < 1) return "şimdi";
  if (minutes < 60) return `${minutes} dk`;
  return `${Math.floor(minutes / 60)} sa ${minutes % 60} dk`;
}

function clamp(value: number) {
  return Math.min(Math.max(Math.round(value * 10) / 10, 4), 96);
}

// Konumsuz masalar için düzgün ızgara (bölüm başına ayrı).
function autoPositions(tables: { id: number; zone: string | null }[]) {
  const positions = new Map<number, { x: number; y: number }>();
  const byZone = new Map<string, number[]>();
  for (const table of tables) {
    const key = table.zone ?? "";
    byZone.set(key, [...(byZone.get(key) ?? []), table.id]);
  }
  for (const ids of byZone.values()) {
    ids.forEach((id, index) => {
      const column = index % 6;
      const row = Math.floor(index / 6);
      positions.set(id, {
        x: clamp(9 + column * 16.4),
        y: clamp(14 + row * 24),
      });
    });
  }
  return positions;
}

/* ---------------- Masa kutusu ---------------- */

function TableTile({
  table,
  now,
  selected,
  onSelect,
}: {
  table: FloorTable;
  now: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const call = table.requests[table.requests.length - 1];
  const sinceText =
    table.status === "cagri" || table.status === "hesap"
      ? elapsedText(call?.lastCalledAt ?? call?.createdAt ?? null, now)
      : elapsedText(table.openedAt, now);

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
      <span className={styles.seats} aria-hidden="true">
        {table.seats} kişilik
      </span>
    </button>
  );
}

/* ---------------- Masa paneli (siparişler, çağrılar, hesap) ---------------- */

function TablePanel({
  table,
  now,
  canAct,
  busy,
  ordersHref,
  onAct,
  onClose,
}: {
  table: FloorTable;
  now: number;
  canAct: boolean;
  busy: boolean;
  ordersHref?: string;
  onAct: (action: string, id: number, confirmText?: string) => void;
  onClose: () => void;
}) {
  return (
    <div
      className={styles.panelRoot}
      role="dialog"
      aria-modal="true"
      aria-labelledby="masa-panel-baslik"
    >
      <button
        type="button"
        className={styles.backdrop}
        onClick={onClose}
        aria-label="Kapat"
        tabIndex={-1}
      />
      <aside className={styles.panel}>
        <header className={styles.panelHead}>
          <div>
            <span
              className={`${styles.statusPill} ${styles[`status_${table.status}`]}`}
            >
              {STATUS_TEXT[table.status]}
            </span>
            <h2 id="masa-panel-baslik">Masa {table.number}</h2>
            <small>
              {table.seats} kişilik
              {table.zone ? ` · ${table.zone}` : ""}
              {table.openedAt
                ? ` · ${elapsedText(table.openedAt, now)} önce açıldı`
                : ""}
            </small>
          </div>
          <button
            type="button"
            className="adm-btn adm-btn-sm"
            onClick={onClose}
            aria-label="Kapat"
          >
            <AdminIcon name="close" size={16} />
          </button>
        </header>

        {table.requests.length > 0 && (
          <section className={styles.panelSection}>
            <h3>Çağrılar</h3>
            {table.requests.map((request) => (
              <div key={request.id} className={styles.requestRow}>
                <span>
                  <strong>
                    {request.type === "hesap"
                      ? "Hesap istiyor"
                      : "Garson çağırıyor"}
                  </strong>
                  <small>
                    {elapsedText(request.createdAt, now)} önce
                    {request.lastCalledAt
                      ? ` · tekrar: ${elapsedText(request.lastCalledAt, now)} önce`
                      : ""}
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
                  <dd className={table.due > 0 ? styles.due : ""}>
                    {money(table.due)}
                  </dd>
                </div>
              </dl>
            </section>

            <section className={styles.panelSection}>
              <h3>Siparişler</h3>
              {table.orders.length === 0 && (
                <p className={styles.emptyNote}>Henüz sipariş yok.</p>
              )}
              {table.orders.map((order) => (
                <article key={order.id} className={styles.orderCard}>
                  <header>
                    <strong>#{order.number}</strong>
                    <span className={styles.orderStatus}>
                      {ORDER_STATUS_TEXT[order.status] ?? order.status}
                    </span>
                    <span className={styles.orderTotal}>
                      {money(order.total)}
                    </span>
                  </header>
                  <ul>
                    {order.items.map((item, index) => (
                      <li key={`${item.name}-${index}`}>
                        <b>{item.quantity}×</b> {item.name}
                      </li>
                    ))}
                  </ul>
                  {canAct && order.status === "pending" && (
                    <button
                      type="button"
                      className="adm-btn adm-btn-sm"
                      disabled={busy}
                      onClick={() => onAct("order:accept", order.id)}
                    >
                      Kabul et
                    </button>
                  )}
                  {canAct && order.status === "ready" && (
                    <button
                      type="button"
                      className="adm-btn adm-btn-sm adm-btn-primary"
                      disabled={busy}
                      onClick={() => onAct("order:deliver", order.id)}
                    >
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
                      : `Masa ${table.number} hesabı kapatılsın mı?`,
                  )
                }
              >
                <AdminIcon name="check" size={16} />
                Hesabı kapat, masayı boşalt
              </button>
            )}
          </>
        )}

        {ordersHref && (
          <a className={styles.panelLink} href={ordersHref}>
            Siparişler sayfasında aç
            <AdminIcon name="external" size={14} />
          </a>
        )}
      </aside>
    </div>
  );
}

/* ---------------- Yerleşim ayarı paneli ---------------- */

function LayoutPanel({
  number,
  draft,
  zones,
  onChange,
  onClose,
}: {
  number: string;
  draft: Draft;
  zones: string[];
  onChange: (next: Partial<Draft>) => void;
  onClose: () => void;
}) {
  return (
    <aside className={styles.editPanel} aria-labelledby="yerlesim-baslik">
      <header className={styles.panelHead}>
        <h2 id="yerlesim-baslik">Masa {number}</h2>
        <button
          type="button"
          className="adm-btn adm-btn-sm"
          onClick={onClose}
          aria-label="Kapat"
        >
          <AdminIcon name="close" size={16} />
        </button>
      </header>

      <div className={styles.field}>
        <span className={styles.fieldLabel}>Şekil</span>
        <div
          className={styles.segment}
          role="radiogroup"
          aria-label="Masa şekli"
        >
          {(Object.keys(SHAPE_TEXT) as FloorShape[]).map((shape) => (
            <button
              key={shape}
              type="button"
              role="radio"
              aria-checked={draft.shape === shape}
              className={draft.shape === shape ? styles.segmentOn : ""}
              onClick={() => onChange({ shape })}
            >
              <span
                className={`${styles.shapeIcon} ${styles[`icon_${shape}`]}`}
                aria-hidden="true"
              />
              {SHAPE_TEXT[shape]}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.field}>
        <span className={styles.fieldLabel}>Kişi sayısı</span>
        <div className={styles.stepper}>
          <button
            type="button"
            aria-label="Azalt"
            disabled={draft.seats <= 1}
            onClick={() => onChange({ seats: draft.seats - 1 })}
          >
            −
          </button>
          <strong aria-live="polite">{draft.seats}</strong>
          <button
            type="button"
            aria-label="Artır"
            disabled={draft.seats >= 20}
            onClick={() => onChange({ seats: draft.seats + 1 })}
          >
            +
          </button>
        </div>
      </div>

      <label className={styles.field}>
        <span className={styles.fieldLabel}>Bölüm</span>
        <input
          className="adm-input"
          list="salon-bolumler"
          value={draft.zone ?? ""}
          maxLength={40}
          placeholder="Örn. Salon, Bahçe, Teras"
          onChange={(event) =>
            onChange({
              zone: event.target.value.trim() ? event.target.value : null,
            })
          }
        />
        <datalist id="salon-bolumler">
          {zones.map((zone) => (
            <option key={zone} value={zone} />
          ))}
        </datalist>
        <small>Boş bırakılırsa masa bölümsüz kalır.</small>
      </label>
    </aside>
  );
}

/* ---------------- Harita ---------------- */

export default function FloorView({
  initialFloor,
  restaurantId,
  canAct,
  loadUrl,
  actionUrl,
  layoutUrl,
  ordersHref,
}: {
  initialFloor: Floor | null;
  restaurantId: number;
  canAct: boolean;
  loadUrl: string;
  actionUrl: string;
  // Verilirse (yönetici) yerleşim düzenlenebilir.
  layoutUrl?: string;
  ordersHref?: string;
}) {
  const [floor, setFloor] = useState<Floor | null>(initialFloor);
  const [zone, setZone] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(
    null,
  );
  const [online, setOnline] = useState(true);

  // Düzenleme modu
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Map<number, Draft>>(new Map());
  const [editId, setEditId] = useState<number | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    id: number;
    startX: number;
    startY: number;
    moved: boolean;
  } | null>(null);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(loadUrl, { cache: "no-store" });
      const result = (await response.json()) as { ok: boolean; floor?: Floor };
      if (!result.ok || !result.floor) throw new Error("salon");
      setFloor(result.floor);
      setOnline(true);
    } catch {
      setOnline(false);
    }
  }, [loadUrl]);

  const live = useBoardSignal(restaurantId, refresh);

  // Sunucudan hazır veri gelmediyse (garson ekranı) ilk yükleme.
  useEffect(() => {
    if (initialFloor) return;
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timer);
  }, [initialFloor, refresh]);

  useEffect(() => {
    if (editing) return;
    const timer = window.setInterval(
      () => void refresh(),
      live ? LIVE_REFRESH_MS : FALLBACK_REFRESH_MS,
    );
    return () => window.clearInterval(timer);
  }, [refresh, live, editing]);

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
    if (selectedId === null && editId === null) return;
    function onKey(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        setSelectedId(null);
        setEditId(null);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [selectedId, editId]);

  const tables = useMemo(() => floor?.tables ?? [], [floor]);

  // Bölümler: düzenlemede taslaktan, görüntülemede kayıttan.
  const zones = useMemo(() => {
    const list = editing
      ? [...draft.values()].map((item) => item.zone)
      : tables.map((table) => table.zone);
    return [
      ...new Set(
        list
          .map((item) => item?.trim())
          .filter((item): item is string => Boolean(item)),
      ),
    ];
  }, [editing, draft, tables]);

  const zoneOf = (table: FloorTable) =>
    editing ? draft.get(table.id)?.zone?.trim() || null : table.zone;
  const shown = zone
    ? tables.filter((table) => zoneOf(table) === zone)
    : tables;

  const counts = useMemo(() => {
    const map = new Map<FloorStatus, number>();
    for (const table of tables)
      map.set(table.status, (map.get(table.status) ?? 0) + 1);
    return STATUS_ORDER.filter((status) => map.get(status)).map((status) => ({
      status,
      count: map.get(status)!,
    }));
  }, [tables]);

  // Bölümdeki tüm masaların konumu girilmişse salon yerleşimi, değilse ızgara.
  const placed =
    shown.length > 0 &&
    shown.every((table) => table.x !== null && table.y !== null);
  const selected = tables.find((table) => table.id === selectedId) ?? null;

  async function act(action: string, id: number, confirmText?: string) {
    if (busy) return;
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true);
    try {
      const response = await fetch(actionUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, id }),
      });
      const result = (await response.json().catch(() => null)) as {
        ok?: boolean;
        message?: string;
      } | null;
      setToast({
        ok: Boolean(result?.ok),
        text:
          result?.message ||
          (result?.ok ? "Güncellendi." : "İşlem yapılamadı."),
      });
      if (action === "session:close" && result?.ok) setSelectedId(null);
      await refresh();
    } catch {
      setToast({ ok: false, text: "Bağlantı hatası. Lütfen tekrar deneyin." });
    } finally {
      setBusy(false);
    }
  }

  /* ----- Düzenleme ----- */

  function startEditing() {
    const auto = autoPositions(
      tables.map((table) => ({ id: table.id, zone: table.zone })),
    );
    setDraft(
      new Map(
        tables.map((table) => [
          table.id,
          {
            shape: table.shape,
            seats: table.seats,
            x: table.x ?? auto.get(table.id)!.x,
            y: table.y ?? auto.get(table.id)!.y,
            zone: table.zone,
          },
        ]),
      ),
    );
    setSelectedId(null);
    setEditing(true);
  }

  function cancelEditing() {
    setEditing(false);
    setEditId(null);
    setDraft(new Map());
  }

  function updateDraft(id: number, next: Partial<Draft>) {
    setDraft((current) => {
      const copy = new Map(current);
      const item = copy.get(id);
      if (item) copy.set(id, { ...item, ...next });
      return copy;
    });
  }

  function arrangeShown() {
    const auto = autoPositions(
      shown.map((table) => ({ id: table.id, zone: null })),
    );
    setDraft((current) => {
      const copy = new Map(current);
      for (const [id, position] of auto) {
        const item = copy.get(id);
        if (item) copy.set(id, { ...item, ...position });
      }
      return copy;
    });
  }

  async function saveLayout() {
    if (!layoutUrl || busy) return;
    setBusy(true);
    try {
      const response = await fetch(layoutUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tables: [...draft.entries()].map(([id, item]) => ({
            id,
            shape: item.shape,
            seats: item.seats,
            x: item.x,
            y: item.y,
            zone: item.zone?.trim() || null,
          })),
        }),
      });
      const result = (await response.json().catch(() => null)) as {
        ok?: boolean;
        message?: string;
      } | null;
      setToast({
        ok: Boolean(result?.ok),
        text: result?.message || "Yerleşim kaydedilemedi.",
      });
      if (result?.ok) {
        await refresh();
        cancelEditing();
      }
    } catch {
      setToast({ ok: false, text: "Bağlantı hatası. Lütfen tekrar deneyin." });
    } finally {
      setBusy(false);
    }
  }

  function moveTo(id: number, clientX: number, clientY: number) {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    updateDraft(id, {
      x: clamp(((clientX - rect.left) / rect.width) * 100),
      y: clamp(((clientY - rect.top) / rect.height) * 100),
    });
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>, id: number) {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      id,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
    };
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    if (
      !drag.moved &&
      Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < 5
    )
      return;
    drag.moved = true;
    moveTo(drag.id, event.clientX, event.clientY);
  }

  function onPointerUp() {
    const drag = dragRef.current;
    dragRef.current = null;
    if (drag && !drag.moved) setEditId(drag.id);
  }

  function onTileKey(event: KeyboardEvent<HTMLDivElement>, id: number) {
    const item = draft.get(id);
    if (!item) return;
    const step = event.shiftKey ? 5 : 1;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    if (moves[event.key]) {
      event.preventDefault();
      updateDraft(id, {
        x: clamp(item.x + moves[event.key][0]),
        y: clamp(item.y + moves[event.key][1]),
      });
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setEditId(id);
    }
  }

  if (!floor) {
    return (
      <div className="adm-empty" role="status">
        <strong>Masalar yükleniyor…</strong>
      </div>
    );
  }

  const editTable =
    editId !== null ? tables.find((table) => table.id === editId) : null;
  const editDraft = editId !== null ? draft.get(editId) : undefined;

  return (
    <div className={styles.wrap}>
      <div className={styles.toolbar}>
        {zones.length > 0 && (
          <div className={styles.zones} role="tablist" aria-label="Bölümler">
            <button
              type="button"
              role="tab"
              aria-selected={zone === null}
              className={zone === null ? styles.zoneOn : ""}
              onClick={() => setZone(null)}
            >
              Tümü
            </button>
            {zones.map((item) => (
              <button
                key={item}
                type="button"
                role="tab"
                aria-selected={zone === item}
                className={zone === item ? styles.zoneOn : ""}
                onClick={() => setZone(item)}
              >
                {item}
              </button>
            ))}
          </div>
        )}

        {editing ? (
          <div className={styles.editActions}>
            <button
              type="button"
              className="adm-btn adm-btn-sm"
              onClick={arrangeShown}
              disabled={busy}
            >
              Otomatik diz
            </button>
            <button
              type="button"
              className="adm-btn adm-btn-sm"
              onClick={cancelEditing}
              disabled={busy}
            >
              Vazgeç
            </button>
            <button
              type="button"
              className="adm-btn adm-btn-sm adm-btn-primary"
              onClick={() => void saveLayout()}
              disabled={busy}
            >
              {busy ? "Kaydediliyor…" : "Kaydet"}
            </button>
          </div>
        ) : (
          <div className={styles.summary} aria-live="polite">
            {counts.map(({ status, count }) => (
              <span
                key={status}
                className={`${styles.summaryItem} ${styles[`status_${status}`]}`}
              >
                <i aria-hidden="true" />
                {STATUS_TEXT[status]} <b>{count}</b>
              </span>
            ))}
            <span className={`${styles.live} ${online ? "" : styles.liveOff}`}>
              {online ? (live ? "Canlı" : "Güncelleniyor") : "Bağlantı yok"}
            </span>
            {layoutUrl && canAct && floor.layoutReady && tables.length > 0 && (
              <button
                type="button"
                className="adm-btn adm-btn-sm"
                onClick={startEditing}
              >
                <AdminIcon name="edit" size={15} />
                Yerleşimi düzenle
              </button>
            )}
          </div>
        )}
      </div>

      {editing && (
        <p className={styles.editHint}>
          Masaları sürükleyerek yerleştirin. Şekil, kişi sayısı ve bölüm için
          masaya dokunun. Klavyede ok tuşlarıyla da taşıyabilirsiniz.
        </p>
      )}

      {shown.length === 0 ? (
        <div className="adm-empty">
          <span className="adm-empty-icon">
            <AdminIcon name="table" />
          </span>
          <strong>Masa bulunamadı</strong>
          <p>Masalarınızı &quot;Masalar&quot; sayfasından ekleyebilirsiniz.</p>
        </div>
      ) : editing ? (
        <div className={styles.editLayout}>
          <div className={styles.canvasScroll}>
            <div
              ref={canvasRef}
              className={`${styles.canvas} ${styles.canvasEditing}`}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={() => (dragRef.current = null)}
            >
              {shown.map((table) => {
                const item = draft.get(table.id)!;
                return (
                  <div
                    key={table.id}
                    className={`${styles.placed} ${item.shape === "uzun" ? styles.placedWide : ""}`}
                    style={{ left: `${item.x}%`, top: `${item.y}%` }}
                  >
                    <div
                      role="button"
                      tabIndex={0}
                      aria-label={`Masa ${table.number}, ${SHAPE_TEXT[item.shape]}, ${item.seats} kişilik. Taşımak için sürükleyin ya da ok tuşlarını kullanın.`}
                      className={`${styles.table} ${styles.editTile} ${styles[`shape_${item.shape}`]} ${styles.status_bos} ${editId === table.id ? styles.selected : ""}`}
                      onPointerDown={(event) => onPointerDown(event, table.id)}
                      onKeyDown={(event) => onTileKey(event, table.id)}
                    >
                      <span className={styles.tableNumber}>{table.number}</span>
                      <span className={styles.tableStatus}>
                        {item.seats} kişilik
                      </span>
                      {item.zone && (
                        <span className={styles.tableMeta}>{item.zone}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          {editTable && editDraft && (
            <LayoutPanel
              number={editTable.number}
              draft={editDraft}
              zones={zones}
              onChange={(next) => updateDraft(editTable.id, next)}
              onClose={() => setEditId(null)}
            />
          )}
        </div>
      ) : placed ? (
        <div className={styles.canvasScroll}>
          <div className={styles.canvas}>
            {shown.map((table) => (
              <div
                key={table.id}
                className={`${styles.placed} ${table.shape === "uzun" ? styles.placedWide : ""}`}
                style={{ left: `${table.x}%`, top: `${table.y}%` }}
              >
                <TableTile
                  table={table}
                  now={now}
                  selected={table.id === selectedId}
                  onSelect={() => setSelectedId(table.id)}
                />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className={styles.grid}>
          {shown.map((table) => (
            <TableTile
              key={table.id}
              table={table}
              now={now}
              selected={table.id === selectedId}
              onSelect={() => setSelectedId(table.id)}
            />
          ))}
        </div>
      )}

      {!editing && selected && (
        <TablePanel
          table={selected}
          now={now}
          canAct={canAct}
          busy={busy}
          ordersHref={ordersHref}
          onAct={act}
          onClose={() => setSelectedId(null)}
        />
      )}

      {toast && (
        <p
          className={`${styles.toast} ${toast.ok ? styles.toastOk : styles.toastError}`}
          role={toast.ok ? "status" : "alert"}
        >
          {toast.text}
        </p>
      )}
    </div>
  );
}
