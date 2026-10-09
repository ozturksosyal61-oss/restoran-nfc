"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import AdminIcon, { type AdminIconName } from "../admin/AdminIcon";
import { useBoardSignal } from "../../lib/board-signal";
import { DENIED_TEXT, IOS_INSTALL_TEXT, disablePush, enablePush, getPushState, refreshPush, type PushState } from "../../lib/push-client";
import type { BoardOrder, BoardRequest, BoardSession, StaffBoard } from "../../lib/staff-board";
import { printKitchenTicket } from "../../lib/kitchen-ticket";
import StaffLogoutButton from "./StaffLogoutButton";

const REFRESH_MS = 5000;
// Anlık sinyal bağlıyken pano yalnızca yedek olarak bu aralıkla yenilenir.
const LIVE_REFRESH_MS = 30000;
const SOUND_KEY = "ozt_staff_sound";
const PRINT_KEY = "ozt_staff_autoprint";

const REQUEST_TEXT: Record<string, string> = {
  garson: "Garson çağırıyor",
  hesap: "Hesap istiyor",
  su: "Su istiyor",
  servis: "Servis istiyor",
  yardim: "Yardım istiyor",
};

function money(value: number) {
  return `${Number(value || 0).toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ₺`;
}

function minutesSince(value: string, now: number) {
  return Math.max(0, Math.floor((now - new Date(value).getTime()) / 60000));
}

function Elapsed({ since, now, warn = 15, late = 25 }: { since: string; now: number; warn?: number; late?: number }) {
  const minutes = minutesSince(since, now);
  const tone = minutes >= late ? "is-late" : minutes >= warn ? "is-warn" : "";
  return <span className={`stf-elapsed ${tone}`}>{minutes < 1 ? "şimdi" : `${minutes} dk`}</span>;
}

// Kısa iki tonlu uyarı sesi (ses dosyası gerekmez).
function beep(context: AudioContext | null) {
  if (!context) return;
  const start = context.currentTime;
  [0, 0.18].forEach((offset, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = index === 0 ? 880 : 1175;
    gain.gain.setValueAtTime(0.0001, start + offset);
    gain.gain.exponentialRampToValueAtTime(0.35, start + offset + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + offset + 0.16);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(start + offset);
    oscillator.stop(start + offset + 0.18);
  });
}

// Panoda "yeni" sayılan kayıtların kimlikleri (sesli uyarı için).
function alertIds(board: StaffBoard) {
  if (board.role === "mutfak") return board.orders.filter((order) => order.status === "pending").map((order) => `o${order.id}`);
  return [
    ...board.requests.map((request) => `r${request.id}`),
    ...board.orders.filter((order) => order.status === "ready").map((order) => `d${order.id}`),
  ];
}

type Act = (action: string, id: number, confirmText?: string) => void;

function ActionButton({
  label,
  icon,
  onClick,
  busy,
  tone = "adm-btn-primary",
  disabled,
}: {
  label: string;
  icon: AdminIconName;
  onClick: () => void;
  busy: boolean;
  tone?: string;
  disabled?: boolean;
}) {
  return (
    <button type="button" className={`adm-btn ${tone} stf-action`} onClick={onClick} disabled={busy || disabled}>
      <AdminIcon name={icon} size={17} />
      {busy ? "Kaydediliyor…" : label}
    </button>
  );
}

function OrderCard({
  order,
  now,
  fresh,
  busy,
  onPrint,
  children,
}: {
  order: BoardOrder;
  now: number;
  fresh: boolean;
  busy: boolean;
  onPrint?: (order: BoardOrder) => void;
  children?: React.ReactNode;
}) {
  return (
    <article className={`stf-card ${fresh ? "is-fresh" : ""} ${busy ? "is-busy" : ""}`}>
      <div className="stf-card-top">
        <span className="stf-table">
          <small>Masa</small>
          {order.table}
        </span>
        <span className="stf-card-meta">
          <span className="adm-num">#{order.number}</span>
          <Elapsed since={order.createdAt} now={now} />
          {onPrint && (
            <button type="button" className="stf-print" onClick={() => onPrint(order)} aria-label={`#${order.number} fişini yazdır`}>
              <AdminIcon name="print" size={14} />
              Fiş
            </button>
          )}
        </span>
      </div>
      <ul className="stf-items">
        {order.items.map((item, index) => (
          <li key={`${item.name}-${index}`}>
            <b>{item.quantity}×</b>
            {item.name}
          </li>
        ))}
      </ul>
      {order.note && (
        <p className="stf-note">
          <AdminIcon name="info" size={14} />
          {order.note}
        </p>
      )}
      {order.customer && order.customer !== "Misafir" && <p className="stf-customer">{order.customer}</p>}
      {children && <div className="stf-card-actions">{children}</div>}
    </article>
  );
}

function Column({
  title,
  count,
  tone,
  empty,
  children,
}: {
  title: string;
  count: number;
  tone: string;
  empty: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`stf-col ${tone}`} aria-label={title}>
      <header className="stf-col-head">
        <h2>{title}</h2>
        <span className="stf-count">{count}</span>
      </header>
      {count === 0 ? <p className="stf-empty">{empty}</p> : <div className="stf-col-list">{children}</div>}
    </section>
  );
}

function KitchenView({
  orders,
  now,
  fresh,
  busyId,
  act,
  onPrint,
}: {
  orders: BoardOrder[];
  now: number;
  fresh: Set<string>;
  busyId: number | null;
  act: Act;
  onPrint: (order: BoardOrder) => void;
}) {
  const waiting = orders.filter((order) => order.status === "pending");
  const cooking = orders.filter((order) => order.status === "accepted" || order.status === "preparing");
  const ready = orders.filter((order) => order.status === "ready");

  return (
    <div className="stf-columns">
      <Column title="Yeni" count={waiting.length} tone="is-new" empty="Yeni sipariş yok.">
        {waiting.map((order) => (
          <OrderCard key={order.id} order={order} now={now} fresh={fresh.has(`o${order.id}`)} busy={busyId === order.id} onPrint={onPrint}>
            <ActionButton label="Kabul et" icon="check" busy={busyId === order.id} onClick={() => act("order:accept", order.id)} />
          </OrderCard>
        ))}
      </Column>
      <Column title="Hazırlanıyor" count={cooking.length} tone="is-cooking" empty="Hazırlanan sipariş yok.">
        {cooking.map((order) => (
          <OrderCard key={order.id} order={order} now={now} fresh={false} busy={busyId === order.id} onPrint={onPrint}>
            {order.status === "accepted" && (
              <ActionButton
                label="Hazırlamaya başla"
                icon="chef"
                tone=""
                busy={busyId === order.id}
                onClick={() => act("order:prepare", order.id)}
              />
            )}
            <ActionButton label="Hazır" icon="bell" busy={busyId === order.id} onClick={() => act("order:ready", order.id)} />
          </OrderCard>
        ))}
      </Column>
      <Column title="Hazır · garson bekliyor" count={ready.length} tone="is-ready" empty="Bekleyen hazır sipariş yok.">
        {ready.map((order) => (
          <OrderCard key={order.id} order={order} now={now} fresh={false} busy={busyId === order.id}>
            <ActionButton
              label="Teslim edildi"
              icon="check"
              tone="adm-btn-ghost"
              busy={busyId === order.id}
              onClick={() => act("order:deliver", order.id)}
            />
          </OrderCard>
        ))}
      </Column>
    </div>
  );
}

function RequestCard({
  request,
  now,
  fresh,
  busy,
  act,
}: {
  request: BoardRequest;
  now: number;
  fresh: boolean;
  busy: boolean;
  act: Act;
}) {
  const bill = request.type === "hesap";
  return (
    <article className={`stf-card stf-request ${bill ? "is-bill" : ""} ${fresh ? "is-fresh" : ""}`}>
      <div className="stf-card-top">
        <span className="stf-table">
          <small>Masa</small>
          {request.table}
        </span>
        <span className="stf-card-meta">
          <Elapsed since={request.createdAt} now={now} warn={3} late={6} />
        </span>
      </div>
      <p className="stf-request-text">
        <AdminIcon name={bill ? "wallet" : "bell"} size={17} />
        {REQUEST_TEXT[request.type] ?? "Garson çağırıyor"}
        {request.status === "acknowledged" && <span className="adm-badge s-accepted">Gidiliyor</span>}
      </p>
      <div className="stf-card-actions">
        {request.status === "pending" && (
          <ActionButton label="Geliyorum" icon="arrowRight" tone="" busy={busy} onClick={() => act("request:ack", request.id)} />
        )}
        <ActionButton label="Tamamlandı" icon="check" busy={busy} onClick={() => act("request:done", request.id)} />
      </div>
    </article>
  );
}

function SessionRow({ session, now, busy, act }: { session: BoardSession; now: number; busy: boolean; act: Act }) {
  const blocked = session.undelivered > 0;
  return (
    <article className="stf-card stf-session">
      <div className="stf-card-top">
        <span className="stf-table">
          <small>Masa</small>
          {session.table}
        </span>
        <span className="stf-card-meta">
          <span>{session.orderCount} sipariş</span>
          <Elapsed since={session.openedAt} now={now} warn={120} late={240} />
        </span>
      </div>
      <dl className="stf-sums">
        <div>
          <dt>Hesap</dt>
          <dd>{money(session.total)}</dd>
        </div>
        <div>
          <dt>Kalan</dt>
          <dd className={session.due > 0 ? "is-due" : ""}>{money(session.due)}</dd>
        </div>
        {session.onlinePaid > 0 && (
          <div>
            <dt>Kartla ödenen</dt>
            <dd>{money(session.onlinePaid)}</dd>
          </div>
        )}
      </dl>
      <div className="stf-card-actions">
        <ActionButton
          label={session.due > 0 ? "Ödeme alındı, hesabı kapat" : "Hesabı kapat"}
          icon="wallet"
          tone="adm-btn-gold"
          busy={busy}
          disabled={blocked}
          onClick={() =>
            act(
              "session:close",
              session.id,
              session.due > 0
                ? `Masa ${session.table}: ${money(session.due)} ödemeyi aldınız mı? Hesap kapatılacak.`
                : `Masa ${session.table} hesabı kapatılsın mı?`
            )
          }
        />
        {blocked && <p className="stf-hint">Teslim edilmemiş {session.undelivered} sipariş var; teslim edilince kapatabilirsiniz.</p>}
      </div>
    </article>
  );
}

function WaiterView({
  board,
  now,
  fresh,
  busyId,
  act,
}: {
  board: Extract<StaffBoard, { role: "garson" }>;
  now: number;
  fresh: Set<string>;
  busyId: number | null;
  act: Act;
}) {
  const ready = board.orders.filter((order) => order.status === "ready");
  const waiting = board.orders.filter((order) => order.status === "pending");

  return (
    <div className="stf-columns">
      <Column title="Çağrılar" count={board.requests.length} tone="is-new" empty="Bekleyen çağrı yok.">
        {board.requests.map((request) => (
          <RequestCard
            key={request.id}
            request={request}
            now={now}
            fresh={fresh.has(`r${request.id}`)}
            busy={busyId === request.id}
            act={act}
          />
        ))}
      </Column>

      <Column title="Masaya götür" count={ready.length + waiting.length} tone="is-ready" empty="Götürülecek sipariş yok.">
        {ready.map((order) => (
          <OrderCard key={order.id} order={order} now={now} fresh={fresh.has(`d${order.id}`)} busy={busyId === order.id}>
            <ActionButton label="Masaya bıraktım" icon="check" busy={busyId === order.id} onClick={() => act("order:deliver", order.id)} />
          </OrderCard>
        ))}
        {waiting.length > 0 && <p className="stf-subhead">Mutfağın onayını bekleyen</p>}
        {waiting.map((order) => (
          <OrderCard key={order.id} order={order} now={now} fresh={false} busy={busyId === order.id}>
            <ActionButton label="Onayla" icon="check" tone="" busy={busyId === order.id} onClick={() => act("order:accept", order.id)} />
          </OrderCard>
        ))}
      </Column>

      <Column title="Açık hesaplar" count={board.sessions.length} tone="is-cooking" empty="Açık hesap yok.">
        {board.sessions.map((session) => (
          <SessionRow key={session.id} session={session} now={now} busy={busyId === session.id} act={act} />
        ))}
      </Column>
    </div>
  );
}

export default function StaffBoardView({
  initialBoard,
  restaurantId,
  name,
  restaurantName,
}: {
  initialBoard: StaffBoard;
  restaurantId: number;
  name: string;
  restaurantName: string;
}) {
  const [board, setBoard] = useState<StaffBoard>(initialBoard);
  const [now, setNow] = useState(() => Date.now());
  const [online, setOnline] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);
  const [sound, setSound] = useState(false);
  const [push, setPush] = useState<PushState>("unsupported");
  const [autoPrint, setAutoPrint] = useState(false);
  const [fresh, setFresh] = useState<Set<string>>(new Set());

  const audioRef = useRef<AudioContext | null>(null);
  const wakeRef = useRef<{ release: () => Promise<void> } | null>(null);
  const seenRef = useRef<Set<string>>(new Set(alertIds(initialBoard)));
  const autoPrintRef = useRef(false);
  const printedRef = useRef<Set<number>>(new Set());

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/personel/pano", { cache: "no-store" });
      if (response.status === 401 || response.status === 403) {
        window.location.assign("/personel");
        return;
      }
      const result = (await response.json()) as { ok: boolean; board?: StaffBoard };
      if (!result.ok || !result.board) throw new Error("pano");
      setOnline(true);

      const ids = alertIds(result.board);
      const added = ids.filter((id) => !seenRef.current.has(id));
      seenRef.current = new Set(ids);
      if (added.length > 0) {
        setFresh(new Set(added));
        if (audioRef.current) beep(audioRef.current);
      }
      // Mutfakta otomatik fiş: yeni gelen her sipariş bir kez basılır.
      if (autoPrintRef.current && result.board.role === "mutfak") {
        for (const order of result.board.orders) {
          if (added.includes(`o${order.id}`) && !printedRef.current.has(order.id)) {
            printedRef.current.add(order.id);
            void printKitchenTicket(order, restaurantName);
          }
        }
      }
      setBoard(result.board);
    } catch {
      setOnline(false);
    }
  }, [restaurantName]);

  // Sipariş ya da çağrı sinyali gelince pano hemen yenilenir.
  const live = useBoardSignal(restaurantId, refresh);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), REFRESH_MS);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => void refresh(), live ? LIVE_REFRESH_MS : REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [refresh, live]);

  // Yeni kayıt vurgusu birkaç saniye sonra kalkar.
  useEffect(() => {
    if (fresh.size === 0) return;
    const timer = window.setTimeout(() => setFresh(new Set()), 12000);
    return () => window.clearTimeout(timer);
  }, [fresh]);

  // Otomatik fiş tercihi bu cihazda hatırlanır.
  useEffect(() => {
    let remembered = false;
    try {
      remembered = window.localStorage.getItem(PRINT_KEY) === "1";
    } catch {
      remembered = false;
    }
    autoPrintRef.current = remembered;
    if (remembered) queueMicrotask(() => setAutoPrint(true));
  }, []);

  function toggleAutoPrint() {
    const next = !autoPrint;
    autoPrintRef.current = next;
    setAutoPrint(next);
    try {
      window.localStorage.setItem(PRINT_KEY, next ? "1" : "0");
    } catch {
      // yok sayılır
    }
    setToast({
      ok: true,
      text: next
        ? "Otomatik fiş açık: yeni siparişler bu cihazdan yazdırılacak."
        : "Otomatik fiş kapatıldı. Siparişteki “Fiş” düğmesiyle elle yazdırabilirsiniz.",
    });
  }

  const printTicket = useCallback(
    (order: BoardOrder) => void printKitchenTicket(order, restaurantName),
    [restaurantName]
  );

  // Telefona bildirim: ekran kapalıyken de yeni sipariş ve çağrı haber verilir.
  useEffect(() => {
    void getPushState().then(setPush);
    void refreshPush();
  }, []);

  async function togglePush() {
    if (push === "ios-install" || push === "denied") {
      setToast({ ok: false, text: push === "denied" ? DENIED_TEXT : IOS_INSTALL_TEXT });
      return;
    }
    if (push === "on") {
      await disablePush();
      setPush("off");
      setToast({ ok: true, text: "Bu cihazda bildirimler kapatıldı." });
      return;
    }
    const result = await enablePush();
    setPush(await getPushState());
    setToast({ ok: result.ok, text: result.message });
  }

  async function enableSound(next: boolean) {
    setSound(next);
    try {
      window.localStorage.setItem(SOUND_KEY, next ? "1" : "0");
    } catch {
      // yok sayılır
    }
    if (next) {
      const Context =
        window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (Context && !audioRef.current) audioRef.current = new Context();
      await audioRef.current?.resume().catch(() => undefined);
      beep(audioRef.current);
      // Tablet ekranı kararmasın.
      try {
        const nav = navigator as unknown as { wakeLock?: { request: (type: "screen") => Promise<{ release: () => Promise<void> }> } };
        wakeRef.current = (await nav.wakeLock?.request("screen")) ?? null;
      } catch {
        wakeRef.current = null;
      }
    } else {
      audioRef.current = null;
      await wakeRef.current?.release().catch(() => undefined);
      wakeRef.current = null;
    }
  }

  // Ses, tarayıcı kuralı gereği bir dokunuşla açılır; tercih hatırlanır ve ilk dokunuşta yeniden açılır.
  useEffect(() => {
    let remembered = false;
    try {
      remembered = window.localStorage.getItem(SOUND_KEY) === "1";
    } catch {
      remembered = false;
    }
    if (!remembered) return;
    const resume = () => void enableSound(true);
    window.addEventListener("pointerdown", resume, { once: true });
    return () => window.removeEventListener("pointerdown", resume);
    // Yalnızca açılışta bir kez kurulur.
  }, []);

  const act: Act = async (action, id, confirmText) => {
    if (busyId !== null) return;
    if (confirmText && !window.confirm(confirmText)) return;
    setBusyId(id);
    setToast(null);
    try {
      const response = await fetch("/api/personel/islem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, id }),
      });
      const result = (await response.json()) as { ok: boolean; message?: string };
      if (!result.ok) setToast({ ok: false, text: result.message || "İşlem yapılamadı." });
      else if (result.message) setToast({ ok: true, text: result.message });
    } catch {
      setToast({ ok: false, text: "Bağlantı hatası. Lütfen tekrar deneyin." });
    } finally {
      setBusyId(null);
      void refresh();
    }
  };

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const kitchen = board.role === "mutfak";
  const pendingCount = kitchen
    ? board.orders.filter((order) => order.status === "pending").length
    : board.requests.length + board.orders.filter((order) => order.status === "ready").length;

  return (
    <div className="stf-shell">
      <header className="stf-bar">
        <div className="stf-bar-title">
          <span className="adm-logo-mark">
            <span>O</span>
          </span>
          <span>
            <strong>{kitchen ? "Mutfak" : "Garson"}</strong>
            <small>
              {restaurantName} · {name}
            </small>
          </span>
        </div>
        <div className="stf-bar-actions">
          <span className={`stf-live ${online ? "" : "is-off"}`} role="status">
            {online ? (pendingCount > 0 ? `${pendingCount} bekleyen` : "Canlı") : "Bağlantı yok"}
          </span>
          <button
            type="button"
            className={`adm-btn adm-btn-sm ${sound ? "stf-sound-on" : ""}`}
            onClick={() => void enableSound(!sound)}
            aria-pressed={sound}
          >
            <AdminIcon name="bell" size={15} />
            {sound ? "Ses açık" : "Sesi aç"}
          </button>
          {kitchen && (
            <button
              type="button"
              className={`adm-btn adm-btn-sm ${autoPrint ? "stf-sound-on" : ""}`}
              onClick={toggleAutoPrint}
              aria-pressed={autoPrint}
              title="Yeni siparişlerin mutfak fişini bu cihazdan otomatik yazdır"
            >
              <AdminIcon name="print" size={15} />
              {autoPrint ? "Otomatik fiş açık" : "Otomatik fiş"}
            </button>
          )}
          {push !== "unsupported" && (
            <button
              type="button"
              className={`adm-btn adm-btn-sm ${push === "on" ? "stf-sound-on" : ""}`}
              onClick={() => void togglePush()}
              aria-pressed={push === "on"}
              title="Telefon kilitliyken de yeni sipariş ve çağrılardan haberdar olun"
            >
              <AdminIcon name="bell" size={15} />
              {push === "on" ? "Bildirim açık" : "Bildirim aç"}
            </button>
          )}
          <StaffLogoutButton compact />
        </div>
      </header>

      {!sound && (
        <p className="stf-sound-hint">
          <AdminIcon name="bell" size={15} />
          {kitchen
            ? "Yeni siparişlerde sesli uyarı ve ekranın açık kalması için “Sesi aç”a dokunun."
            : "Yeni çağrı ve hazır siparişlerde sesli uyarı için “Sesi aç”a dokunun."}
        </p>
      )}

      <main className="stf-main">
        {board.role === "mutfak" ? (
          <KitchenView orders={board.orders} now={now} fresh={fresh} busyId={busyId} act={act} onPrint={printTicket} />
        ) : (
          <WaiterView board={board} now={now} fresh={fresh} busyId={busyId} act={act} />
        )}
      </main>

      {toast && (
        <p className={`stf-toast ${toast.ok ? "is-ok" : "is-error"}`} role={toast.ok ? "status" : "alert"}>
          <AdminIcon name={toast.ok ? "check" : "alert"} size={16} />
          {toast.text}
        </p>
      )}
    </div>
  );
}
