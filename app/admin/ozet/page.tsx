import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminRestaurant } from "../../../lib/admin-restaurant";
import { hasPlanFeature } from "../../../lib/plan";
import { buildInsights, type FeedbackSummary } from "../../../lib/report-insights";
import { resolveSummary, summaryOptions, type SummaryKind } from "../../../lib/report-periods";
import { readMenuOnly } from "../../../lib/restaurant-type";
import { loadMenuStats, loadSalesReport } from "../raporlar/data";
import SummaryView from "./SummaryView";

// Dönemdeki müşteri geri bildirimleri; tablo yoksa özet bu bölümü atlar.
async function loadFeedback(
  supabase: SupabaseClient,
  restaurantId: number,
  from: Date,
  to: Date
): Promise<FeedbackSummary | null> {
  const { data, error } = await supabase
    .from("customer_feedback")
    .select("rating, went_to_google, is_resolved")
    .eq("restaurant_id", restaurantId)
    .gte("created_at", from.toISOString())
    .lt("created_at", to.toISOString())
    .limit(5000);

  if (error) return null;

  const rows = data ?? [];
  return {
    count: rows.length,
    average: rows.length > 0 ? rows.reduce((sum, row) => sum + Number(row.rating), 0) / rows.length : 0,
    toGoogle: rows.filter((row) => row.went_to_google).length,
    openComplaints: rows.filter((row) => Number(row.rating) <= 3 && !row.is_resolved).length,
  };
}

export default async function SummaryPage({
  searchParams,
}: {
  searchParams: Promise<{ tur?: string; donem?: string }>;
}) {
  const admin = await getAdminRestaurant();
  if (!admin) redirect("/admin/login");

  const { supabase, restaurantId } = admin;
  const params = await searchParams;

  const kind: SummaryKind = params.tur === "hafta" ? "hafta" : "ay";
  const options = summaryOptions(kind);
  const period = resolveSummary(kind, params.donem);

  const [{ data: restaurant }, menuOnly] = await Promise.all([
    supabase.from("restaurants").select("name, plan").eq("id", restaurantId).maybeSingle(),
    readMenuOnly(supabase, restaurantId),
  ]);

  const analytics = hasPlanFeature(restaurant?.plan, "analytics");
  const showSales = !menuOnly && analytics;

  const [sales, previousSales, menu, previousMenu, feedback] = await Promise.all([
    showSales ? loadSalesReport(supabase, restaurantId, period.from, period.to) : Promise.resolve(null),
    showSales ? loadSalesReport(supabase, restaurantId, period.previous.from, period.previous.to) : Promise.resolve(null),
    loadMenuStats(supabase, restaurantId, period.from, period.to),
    loadMenuStats(supabase, restaurantId, period.previous.from, period.previous.to),
    loadFeedback(supabase, restaurantId, period.from, period.to),
  ]);

  const insights = buildInsights({ kind, sales, previousSales, menu, previousMenu, feedback });

  return (
    <SummaryView
      restaurantName={restaurant?.name ?? "İşletme"}
      kind={kind}
      period={period}
      options={options}
      showSales={showSales}
      salesLocked={!menuOnly && !analytics}
      sales={sales}
      previousSales={previousSales}
      menu={menu}
      previousMenu={previousMenu}
      feedback={feedback}
      insights={insights}
    />
  );
}
