import { redirect } from "next/navigation";
import { getAdminRestaurant } from "../../../lib/admin-restaurant";
import { hasPlanFeature } from "../../../lib/plan";
import { buildInsights } from "../../../lib/report-insights";
import { resolveSummary, summaryOptions, type SummaryKind } from "../../../lib/report-periods";
import { readMenuOnly } from "../../../lib/restaurant-type";
import { loadFeedback, loadMenuStats, loadSalesReport } from "../raporlar/data";
import SummaryView from "./SummaryView";
import ReportEmailCard from "./ReportEmailCard";

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

  const [{ data: restaurant }, menuOnly, { data: reportSettings, error: reportSettingsError }] = await Promise.all([
    supabase.from("restaurants").select("name, plan").eq("id", restaurantId).maybeSingle(),
    readMenuOnly(supabase, restaurantId),
    // Haftalık rapor e-postası (20261101); sütunlar yoksa kart gösterilmez.
    supabase.from("restaurants").select("report_email_enabled, report_email").eq("id", restaurantId).maybeSingle(),
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
      emailCard={
        !reportSettingsError && reportSettings ? (
          <ReportEmailCard
            enabled={reportSettings.report_email_enabled === true}
            email={(reportSettings.report_email as string | null) ?? null}
            loginEmail={admin.user.email ?? null}
          />
        ) : null
      }
    />
  );
}
