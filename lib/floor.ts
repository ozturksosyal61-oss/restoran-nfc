import { createSupabaseAdminClient } from "./supabase-admin";
import { tableLabel, type BoardItem } from "./staff-board";

// Canlı masa haritası verisi: her masanın şekli, konumu ve anlık durumu
// (boş, dolu, yeni sipariş, hazır, garson çağrısı, hesap isteği, ödendi).
// Yönetici "Salon" sayfası ve garson ekranı ortak kullanır. Çağıran taraf
// restorana erişim yetkisini doğrulamış olmalıdır.

export type FloorShape = "kare" | "yuvarlak" | "uzun";
export type FloorStatus = "bos" | "dolu" | "siparis" | "hazir" | "cagri" | "hesap" | "odendi";

export type FloorOrder = {
  id: number;
  number: number;
  status: string;
  paid: boolean;
  total: number;
  createdAt: string;
  items: BoardItem[];
};

export type FloorRequest = {
  id: number;
  type: string;
  status: string;
  createdAt: string;
  lastCalledAt: string | null;
};

export type FloorTable = {
  id: number;
  number: string;
  shape: FloorShape;
  seats: number;
  x: number | null;
  y: number | null;
  zone: string | null;
  status: FloorStatus;
  sessionId: number | null;
  openedAt: string | null;
  total: number;
  due: number;
  onlinePaid: number;
  orders: FloorOrder[];
  requests: FloorRequest[];
};

export type Floor = {
  tables: FloorTable[];
  zones: string[];
  // Yerleşim sütunları veritabanında var mı (migration uygulanmış mı).
  layoutReady: boolean;
};

const HOURS = 60 * 60 * 1000;
const SHAPES: FloorShape[] = ["kare", "yuvarlak", "uzun"];

type TableRow = {
  id: number;
  table_number: unknown;
  shape?: unknown;
  seats?: unknown;
  pos_x?: unknown;
  pos_y?: unknown;
  zone?: unknown;
};

function numberOrNull(value: unknown) {
  const number = Number(value);
  return value === null || value === undefined || !Number.isFinite(number) ? null : number;
}

// Masa numarasına göre doğal sıralama (2, 10, 11; "Bahçe 1" metinleri sonda).
function compareTables(a: TableRow, b: TableRow) {
  const na = Number(a.table_number);
  const nb = Number(b.table_number);
  if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
  return String(a.table_number).localeCompare(String(b.table_number), "tr", { numeric: true });
}

// Öncelik: hesap isteği > garson çağrısı > hazır sipariş > yeni sipariş > dolu.
function tableStatus(table: Pick<FloorTable, "requests" | "orders" | "sessionId" | "total" | "due">): FloorStatus {
  if (table.requests.some((request) => request.type === "hesap")) return "hesap";
  if (table.requests.length > 0) return "cagri";
  if (table.orders.some((order) => order.status === "ready")) return "hazir";
  if (table.orders.some((order) => order.status === "pending")) return "siparis";
  if (table.sessionId === null) return "bos";
  if (table.total > 0 && table.due <= 0) return "odendi";
  return "dolu";
}

export async function loadFloor(restaurantId: number): Promise<Floor> {
  const admin = createSupabaseAdminClient();

  // Yerleşim sütunları henüz yoksa (migration bekliyor) onsuz okunur.
  const withLayout = await admin
    .from("restaurant_tables")
    .select("id, table_number, shape, seats, pos_x, pos_y, zone")
    .eq("restaurant_id", restaurantId)
    .eq("is_active", true);
  const layoutReady = !withLayout.error;
  const tableResult = layoutReady
    ? withLayout
    : await admin
        .from("restaurant_tables")
        .select("id, table_number")
        .eq("restaurant_id", restaurantId)
        .eq("is_active", true);
  const tableRows = ((tableResult.data ?? []) as TableRow[]).sort(compareTables);

  const { data: sessionRows } = await admin
    .from("dining_sessions")
    .select("id, table_id, opened_at")
    .eq("restaurant_id", restaurantId)
    .eq("status", "open")
    .limit(200);
  const sessions = sessionRows ?? [];
  const sessionIds = sessions.map((session) => Number(session.id));

  const requestQuery = (columns: string) =>
    admin
      .from("service_requests")
      .select(columns)
      .eq("restaurant_id", restaurantId)
      .in("status", ["pending", "acknowledged"])
      .gte("created_at", new Date(Date.now() - 12 * HOURS).toISOString())
      .order("created_at", { ascending: true })
      .limit(200);

  const [ordersResult, onlineResult, requestsFirst] = await Promise.all([
    sessionIds.length
      ? admin
          .from("orders")
          .select("id, daily_number, session_id, status, payment_status, total_amount, created_at")
          .in("session_id", sessionIds)
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    sessionIds.length
      ? admin
          .from("online_payments")
          .select("session_id, amount, tip_amount")
          .eq("restaurant_id", restaurantId)
          .eq("kind", "bill")
          .eq("status", "success")
          .in("session_id", sessionIds)
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    requestQuery("id, table_id, request_type, status, created_at, last_called_at"),
  ]);
  const requestsResult = requestsFirst.error
    ? await requestQuery("id, table_id, request_type, status, created_at")
    : requestsFirst;

  const orders = ((ordersResult.data ?? []) as Record<string, unknown>[]).filter(
    (order) => order.status !== "cancelled"
  );
  const orderIds = orders.map((order) => Number(order.id));
  const { data: itemRows } = orderIds.length
    ? await admin.from("order_items").select("order_id, product_name, quantity").in("order_id", orderIds).order("id")
    : { data: [] as { order_id: unknown; product_name: unknown; quantity: unknown }[] };

  const itemsByOrder = new Map<number, BoardItem[]>();
  for (const item of itemRows ?? []) {
    const list = itemsByOrder.get(Number(item.order_id)) ?? [];
    list.push({ name: String(item.product_name ?? "Ürün"), quantity: Number(item.quantity ?? 1) });
    itemsByOrder.set(Number(item.order_id), list);
  }

  const requests = (requestsResult.data ?? []) as unknown as Record<string, unknown>[];
  const online = (onlineResult.data ?? []) as Record<string, unknown>[];

  const tables: FloorTable[] = tableRows.map((row) => {
    const session = sessions.find((item) => Number(item.table_id) === Number(row.id)) ?? null;
    const sessionOrders: FloorOrder[] = session
      ? orders
          .filter((order) => Number(order.session_id) === Number(session.id))
          .map((order) => ({
            id: Number(order.id),
            number: Number(order.daily_number ?? order.id),
            status: String(order.status),
            paid: ["paid", "refunded"].includes(String(order.payment_status ?? "unpaid")),
            total: Number(order.total_amount ?? 0),
            createdAt: String(order.created_at),
            items: itemsByOrder.get(Number(order.id)) ?? [],
          }))
      : [];

    const total = sessionOrders.reduce((sum, order) => sum + order.total, 0);
    const unpaid = sessionOrders.filter((order) => !order.paid).reduce((sum, order) => sum + order.total, 0);
    const onlinePaid = session
      ? online
          .filter((payment) => Number(payment.session_id) === Number(session.id))
          .reduce((sum, payment) => sum + Number(payment.amount) - Number(payment.tip_amount ?? 0), 0)
      : 0;

    const tableRequests: FloorRequest[] = requests
      .filter((request) => Number(request.table_id) === Number(row.id))
      .map((request) => ({
        id: Number(request.id),
        type: String(request.request_type ?? "garson"),
        status: String(request.status),
        createdAt: String(request.created_at),
        lastCalledAt: request.last_called_at ? String(request.last_called_at) : null,
      }));

    const shape = SHAPES.includes(row.shape as FloorShape) ? (row.shape as FloorShape) : "kare";
    const table = {
      id: Number(row.id),
      number: tableLabel(row.table_number),
      shape,
      seats: Math.min(Math.max(Number(row.seats) || 4, 1), 20),
      x: numberOrNull(row.pos_x),
      y: numberOrNull(row.pos_y),
      zone: typeof row.zone === "string" && row.zone.trim() ? row.zone.trim() : null,
      sessionId: session ? Number(session.id) : null,
      openedAt: session ? String(session.opened_at) : null,
      total,
      due: Math.max(unpaid - onlinePaid, 0),
      onlinePaid,
      orders: sessionOrders,
      requests: tableRequests,
    };
    return { ...table, status: tableStatus(table) };
  });

  const zones = [...new Set(tables.map((table) => table.zone).filter((zone): zone is string => Boolean(zone)))];
  return { tables, zones, layoutReady };
}
