import { createSupabaseAdminClient } from "./supabase-admin";
import type { StaffRole, StaffSession } from "./staff";

// Garson ve mutfak ekranlarının verisi ve izin verilen işlemler.
// Çağıran taraf oturumu checkStaffSession ile doğrulamış olmalıdır; her
// sorgu ve güncelleme oturumdaki restorana sınırlanır.

export type BoardItem = { name: string; quantity: number };

export type BoardOrder = {
  id: number;
  number: number;
  table: string;
  customer: string | null;
  note: string | null;
  status: string;
  total: number;
  createdAt: string;
  items: BoardItem[];
};

export type BoardRequest = {
  id: number;
  table: string;
  type: string;
  status: string;
  createdAt: string;
};

export type BoardSession = {
  id: number;
  table: string;
  openedAt: string;
  orderCount: number;
  total: number;
  due: number;
  onlinePaid: number;
  undelivered: number;
};

export type KitchenBoard = { role: "mutfak"; orders: BoardOrder[] };
export type WaiterBoard = {
  role: "garson";
  requests: BoardRequest[];
  orders: BoardOrder[];
  sessions: BoardSession[];
};
export type StaffBoard = KitchenBoard | WaiterBoard;

const ACTIVE_STATUSES = ["pending", "accepted", "preparing", "ready"];
const HOURS = 60 * 60 * 1000;

function tableLabel(value: unknown) {
  return value === null || value === undefined || value === "" ? "—" : String(value);
}

async function loadOrders(restaurantId: number, statuses: string[], sinceHours: number): Promise<BoardOrder[]> {
  const admin = createSupabaseAdminClient();
  const since = new Date(Date.now() - sinceHours * HOURS).toISOString();
  const { data: orders } = await admin
    .from("orders")
    .select("id, daily_number, table_number, customer_name, note, status, total_amount, created_at")
    .eq("restaurant_id", restaurantId)
    .in("status", statuses)
    .gte("created_at", since)
    .order("created_at", { ascending: true })
    .limit(150);

  const rows = orders ?? [];
  if (rows.length === 0) return [];

  const { data: items } = await admin
    .from("order_items")
    .select("order_id, product_name, quantity")
    .in(
      "order_id",
      rows.map((row) => row.id)
    )
    .order("id", { ascending: true });

  const byOrder = new Map<number, BoardItem[]>();
  for (const item of items ?? []) {
    const list = byOrder.get(Number(item.order_id)) ?? [];
    list.push({ name: String(item.product_name ?? "Ürün"), quantity: Number(item.quantity ?? 1) });
    byOrder.set(Number(item.order_id), list);
  }

  return rows.map((row) => ({
    id: Number(row.id),
    number: Number(row.daily_number ?? row.id),
    table: tableLabel(row.table_number),
    customer: row.customer_name ? String(row.customer_name) : null,
    note: row.note ? String(row.note) : null,
    status: String(row.status),
    total: Number(row.total_amount ?? 0),
    createdAt: String(row.created_at),
    items: byOrder.get(Number(row.id)) ?? [],
  }));
}

async function loadRequests(restaurantId: number): Promise<BoardRequest[]> {
  const { data } = await createSupabaseAdminClient()
    .from("service_requests")
    .select("id, request_type, status, created_at, restaurant_tables(table_number)")
    .eq("restaurant_id", restaurantId)
    .in("status", ["pending", "acknowledged"])
    .gte("created_at", new Date(Date.now() - 12 * HOURS).toISOString())
    .order("created_at", { ascending: true })
    .limit(100);

  return (data ?? []).map((row) => {
    const table = row.restaurant_tables as unknown as { table_number?: unknown } | { table_number?: unknown }[] | null;
    const number = Array.isArray(table) ? table[0]?.table_number : table?.table_number;
    return {
      id: Number(row.id),
      table: tableLabel(number),
      type: String(row.request_type ?? "garson"),
      status: String(row.status),
      createdAt: String(row.created_at),
    };
  });
}

async function loadSessions(restaurantId: number): Promise<BoardSession[]> {
  const admin = createSupabaseAdminClient();
  const { data: sessions } = await admin
    .from("dining_sessions")
    .select("id, table_id, opened_at")
    .eq("restaurant_id", restaurantId)
    .eq("status", "open")
    .order("opened_at", { ascending: true })
    .limit(100);

  const list = sessions ?? [];
  if (list.length === 0) return [];
  const sessionIds = list.map((session) => session.id);
  const tableIds = [...new Set(list.map((session) => session.table_id).filter(Boolean))];

  const [{ data: orders }, { data: tables }, { data: online }] = await Promise.all([
    admin
      .from("orders")
      .select("session_id, status, payment_status, total_amount")
      .in("session_id", sessionIds),
    tableIds.length
      ? admin.from("restaurant_tables").select("id, table_number").in("id", tableIds)
      : Promise.resolve({ data: [] as { id: number; table_number: unknown }[] }),
    // Online ödeme tablosu yoksa (eski kurulum) kartla ödenen 0 sayılır.
    admin
      .from("online_payments")
      .select("session_id, amount, tip_amount")
      .eq("restaurant_id", restaurantId)
      .eq("kind", "bill")
      .eq("status", "success")
      .in("session_id", sessionIds),
  ]);

  const tableNumbers = new Map((tables ?? []).map((table) => [Number(table.id), tableLabel(table.table_number)]));

  return list.map((session) => {
    const sessionOrders = (orders ?? []).filter(
      (order) => Number(order.session_id) === Number(session.id) && order.status !== "cancelled"
    );
    const total = sessionOrders.reduce((sum, order) => sum + Number(order.total_amount ?? 0), 0);
    const unpaid = sessionOrders
      .filter((order) => !["paid", "refunded"].includes(String(order.payment_status ?? "unpaid")))
      .reduce((sum, order) => sum + Number(order.total_amount ?? 0), 0);
    const onlinePaid = (online ?? [])
      .filter((row) => Number(row.session_id) === Number(session.id))
      .reduce((sum, row) => sum + Number(row.amount) - Number(row.tip_amount ?? 0), 0);

    return {
      id: Number(session.id),
      table: tableNumbers.get(Number(session.table_id)) ?? "—",
      openedAt: String(session.opened_at),
      orderCount: sessionOrders.length,
      total,
      due: Math.max(unpaid - onlinePaid, 0),
      onlinePaid,
      undelivered: sessionOrders.filter(
        (order) =>
          order.status !== "delivered" && !["paid", "refunded"].includes(String(order.payment_status ?? "unpaid"))
      ).length,
    };
  });
}

export async function loadStaffBoard(session: StaffSession): Promise<StaffBoard> {
  if (session.role === "mutfak") {
    return { role: "mutfak", orders: await loadOrders(session.restaurantId, ACTIVE_STATUSES, 12) };
  }

  const [requests, orders, sessions] = await Promise.all([
    loadRequests(session.restaurantId),
    loadOrders(session.restaurantId, ["pending", "ready"], 12),
    loadSessions(session.restaurantId),
  ]);
  return { role: "garson", requests, orders, sessions };
}

/* ---------------------------------------------------------------
 * İşlemler
 * ------------------------------------------------------------- */

export type StaffAction =
  | "order:accept"
  | "order:prepare"
  | "order:ready"
  | "order:deliver"
  | "request:ack"
  | "request:done"
  | "session:close";

// Hangi görev hangi sipariş durumunu hangisine çevirebilir.
const ORDER_MOVES: Record<string, { from: string[]; to: string; roles: StaffRole[] }> = {
  "order:accept": { from: ["pending"], to: "accepted", roles: ["mutfak", "garson"] },
  "order:prepare": { from: ["accepted"], to: "preparing", roles: ["mutfak"] },
  "order:ready": { from: ["accepted", "preparing"], to: "ready", roles: ["mutfak"] },
  "order:deliver": { from: ["ready"], to: "delivered", roles: ["garson", "mutfak"] },
};

export function isStaffAction(value: unknown): value is StaffAction {
  return (
    typeof value === "string" &&
    ["order:accept", "order:prepare", "order:ready", "order:deliver", "request:ack", "request:done", "session:close"].includes(
      value
    )
  );
}

export async function runStaffAction(
  session: StaffSession,
  action: StaffAction,
  id: number
): Promise<{ ok: boolean; message: string }> {
  const admin = createSupabaseAdminClient();
  const restaurantId = session.restaurantId;

  if (action in ORDER_MOVES) {
    const move = ORDER_MOVES[action];
    if (!move.roles.includes(session.role)) return { ok: false, message: "Bu işlem için yetkiniz yok." };

    const { data, error } = await admin
      .from("orders")
      .update({ status: move.to })
      .eq("id", id)
      .eq("restaurant_id", restaurantId)
      .in("status", move.from)
      .select("id");

    if (error) return { ok: false, message: `Güncellenemedi: ${error.message}` };
    if (!data?.length) return { ok: false, message: "Sipariş bu arada güncellenmiş. Ekran yenileniyor." };
    return { ok: true, message: "" };
  }

  if (action === "request:ack" || action === "request:done") {
    if (session.role !== "garson") return { ok: false, message: "Bu işlem için yetkiniz yok." };
    const update =
      action === "request:ack"
        ? { status: "acknowledged" }
        : { status: "completed", completed_at: new Date().toISOString() };

    const { data, error } = await admin
      .from("service_requests")
      .update(update)
      .eq("id", id)
      .eq("restaurant_id", restaurantId)
      .in("status", action === "request:ack" ? ["pending"] : ["pending", "acknowledged"])
      .select("id");

    if (error) return { ok: false, message: `Güncellenemedi: ${error.message}` };
    if (!data?.length) return { ok: false, message: "Çağrı bu arada güncellenmiş. Ekran yenileniyor." };
    return { ok: true, message: "" };
  }

  // Hesabı kapat: yönetici panelindeki "Hesabı kapat, ödendi say" ile aynı kural.
  if (session.role !== "garson") return { ok: false, message: "Bu işlem için yetkiniz yok." };

  const { data: dining } = await admin
    .from("dining_sessions")
    .select("id")
    .eq("id", id)
    .eq("restaurant_id", restaurantId)
    .eq("status", "open")
    .maybeSingle();
  if (!dining) return { ok: false, message: "Açık hesap bulunamadı. Ekran yenileniyor." };

  const { data: open } = await admin
    .from("orders")
    .select("id, status, payment_status")
    .eq("session_id", id)
    .eq("restaurant_id", restaurantId);

  const unpaid = (open ?? []).filter(
    (order) => order.status !== "cancelled" && !["paid", "refunded"].includes(String(order.payment_status ?? "unpaid"))
  );
  if (unpaid.some((order) => order.status !== "delivered")) {
    return { ok: false, message: "Hesap kapatılamaz: masada teslim edilmemiş sipariş var." };
  }

  if (unpaid.length > 0) {
    const { error: payError } = await admin
      .from("orders")
      .update({ payment_status: "paid" })
      .in(
        "id",
        unpaid.map((order) => order.id)
      )
      .eq("restaurant_id", restaurantId);
    if (payError) return { ok: false, message: `Hesap kapatılamadı: ${payError.message}` };
  }

  const { error: closeError } = await admin
    .from("dining_sessions")
    .update({ status: "closed", closed_at: new Date().toISOString() })
    .eq("id", id)
    .eq("restaurant_id", restaurantId)
    .eq("status", "open");
  if (closeError) return { ok: false, message: `Hesap kapatılamadı: ${closeError.message}` };

  return { ok: true, message: "Hesap kapatıldı." };
}
