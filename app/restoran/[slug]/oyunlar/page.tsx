import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { supabase } from "../../../../lib/supabase";
import { visibleTableGames } from "../../../../lib/table-games";
import GamesApp from "./GamesApp";

export const metadata: Metadata = {
  title: "Masa Oyunları",
  robots: { index: false, follow: false },
};

// Masa oyunları: işletme açtıysa ve paketi uygunsa açılır; değilse
// restoranın ana sayfasına dönülür. Oyunlar tamamen telefonda çalışır,
// veritabanına hiçbir şey yazılmaz.
export default async function TableGamesPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ masa?: string }>;
}) {
  const { slug } = await params;
  const { masa } = await searchParams;
  const tableToken = masa?.trim() || null;
  const home = `/restoran/${encodeURIComponent(slug)}${tableToken ? `?masa=${encodeURIComponent(tableToken)}` : ""}`;

  const read = (columns: string) =>
    supabase.from("restaurants").select(columns).eq("slug", slug).eq("is_active", true).maybeSingle();
  // Oyun sütunu (20261020) henüz yoksa oyunlar kapalı sayılır.
  let result = await read("name, plan, menu_only, table_games");
  if (result.error) result = await read("name, plan, menu_only");
  const data = result.data as unknown as
    | { name: string; plan: string | null; menu_only: boolean | null; table_games?: unknown }
    | null;

  const games = data ? visibleTableGames(data.table_games, data.plan, data.menu_only === true) : [];
  if (!data || games.length === 0) redirect(home);

  return <GamesApp slug={slug} restaurantName={String(data.name)} games={games} tableToken={tableToken} homeHref={home} />;
}
