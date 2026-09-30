import type { SupabaseClient } from "@supabase/supabase-js";

export type SalesReport = {
  revenue: number;
  orders: number;
  paid_total: number;
  unpaid_total: number;
  refunded_total: number;
  refunded_count: number;
  cancelled_count: number;
  items_sold: number;
  sessions: number;
  session_total: number;
  session_minutes: number;
  by_day: { day: string; revenue: number; orders: number; paid: number | null }[];
  by_hour: { hour: number; revenue: number; orders: number }[];
  by_weekday: { weekday: number; revenue: number; orders: number }[];
  by_payment: { method: string; revenue: number; orders: number }[];
  top_products: { name: string; quantity: number; revenue: number }[];
  by_category: { name: string; quantity: number; revenue: number }[];
  by_table: { table: string; revenue: number; orders: number }[];
};

export type MenuStats = {
  menu_views: number;
  visitors: number;
  product_views: number;
  by_day: { day: string; views: number; visitors: number }[];
  by_hour: { hour: number; views: number }[];
  by_language: { language: string; views: number }[];
  top_products: { name: string; category: string; views: number }[];
  unseen_products: { name: string; category: string }[];
  unseen_count: number;
  first_event: string | null;
};

export async function loadSalesReport(
  supabase: SupabaseClient,
  restaurantId: number,
  from: Date,
  to: Date
): Promise<SalesReport | null> {
  const { data, error } = await supabase.rpc("get_sales_report", {
    p_restaurant_id: restaurantId,
    p_from: from.toISOString(),
    p_to: to.toISOString(),
  });

  if (error) {
    console.error("Satış raporu alınamadı:", error.message);
    return null;
  }
  return data as SalesReport;
}

export async function loadMenuStats(
  supabase: SupabaseClient,
  restaurantId: number,
  from: Date,
  to: Date
): Promise<MenuStats | null> {
  const { data, error } = await supabase.rpc("get_menu_stats", {
    p_restaurant_id: restaurantId,
    p_from: from.toISOString(),
    p_to: to.toISOString(),
  });

  if (error) {
    console.error("Menü istatistikleri alınamadı:", error.message);
    return null;
  }
  return data as MenuStats;
}

export const PAYMENT_LABELS: Record<string, string> = {
  cash: "Nakit",
  card: "Kart (POS)",
  online: "Online",
};

// İş günü 05:00'te başladığı için saatler 05'ten sıralanır.
export const BUSINESS_HOURS = [...Array.from({ length: 19 }, (_, i) => i + 5), 0, 1, 2, 3, 4];
