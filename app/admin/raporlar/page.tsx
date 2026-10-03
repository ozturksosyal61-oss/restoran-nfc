import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminRestaurant } from "../../../lib/admin-restaurant";
import { hasPlanFeature } from "../../../lib/plan";
import { resolvePeriod } from "../../../lib/report-periods";
import { readMenuOnly } from "../../../lib/restaurant-type";
import AdminIcon from "../AdminIcon";
import { loadSalesReport } from "./data";
import SalesReportView from "./SalesReportView";

export default async function SalesReportPage({
  searchParams,
}: {
  searchParams: Promise<{ donem?: string; bas?: string; bit?: string }>;
}) {
  const admin = await getAdminRestaurant();
  if (!admin) redirect("/admin/login");

  const { supabase, restaurantId } = admin;

  if (await readMenuOnly(supabase, restaurantId)) redirect("/admin/menu/istatistik");

  const { data: restaurant } = await supabase.from("restaurants").select("plan").eq("id", restaurantId).maybeSingle();

  if (!hasPlanFeature(restaurant?.plan, "analytics")) {
    return (
      <main className="adm-page">
        <div className="adm-empty">
          <span className="adm-empty-icon"><AdminIcon name="lock" /></span>
          <strong>Satış raporları paketinizde yok</strong>
          <p>Günlük ciro, hesap ve ürün satış raporları Pro ve Premium paketlerde açıktır.</p>
          <Link className="adm-btn adm-btn-primary" href="/abonelik">Paketleri gör</Link>
        </div>
      </main>
    );
  }

  const params = await searchParams;
  const period = resolvePeriod(params, "bugun");

  const [report, previous] = await Promise.all([
    loadSalesReport(supabase, restaurantId, period.from, period.to),
    loadSalesReport(supabase, restaurantId, period.previous.from, period.previous.to),
  ]);

  return (
    <SalesReportView
      period={period}
      report={report}
      previous={previous}
      canExport={hasPlanFeature(restaurant?.plan, "advanced_reports")}
    />
  );
}
