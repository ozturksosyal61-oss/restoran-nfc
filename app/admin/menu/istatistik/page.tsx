import { redirect } from "next/navigation";
import { getAdminRestaurant } from "../../../../lib/admin-restaurant";
import { resolvePeriod } from "../../../../lib/report-periods";
import { loadMenuStats } from "../../raporlar/data";
import MenuStatsView from "./MenuStatsView";

export default async function MenuStatsPage({
  searchParams,
}: {
  searchParams: Promise<{ donem?: string; bas?: string; bit?: string }>;
}) {
  const admin = await getAdminRestaurant();
  if (!admin) redirect("/admin/login");

  const { supabase, restaurantId } = admin;
  const period = resolvePeriod(await searchParams, "son-7");

  const [stats, previous] = await Promise.all([
    loadMenuStats(supabase, restaurantId, period.from, period.to),
    loadMenuStats(supabase, restaurantId, period.previous.from, period.previous.to),
  ]);

  return <MenuStatsView period={period} stats={stats} previous={previous} />;
}
