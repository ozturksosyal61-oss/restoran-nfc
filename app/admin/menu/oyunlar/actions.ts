"use server";

import { revalidatePath } from "next/cache";
import { getAdminRestaurant } from "../../../../lib/admin-restaurant";
import { planGate } from "../../../../lib/admin-plan";
import { DEMO_BLOCKED_MESSAGE } from "../../../../lib/demo";
import { TABLE_GAMES, type TableGameId } from "../../../../lib/table-games";

export type GamesResult = { ok: boolean; message: string } | null;

// Masa oyunları ayarı: açık/kapalı ve görünen oyunlar.
export async function saveTableGames(_prev: GamesResult, formData: FormData): Promise<GamesResult> {
  const admin = await getAdminRestaurant();
  if (!admin) return { ok: false, message: "Oturum bulunamadı. Lütfen tekrar giriş yapın." };
  if (admin.isDemo) return { ok: false, message: DEMO_BLOCKED_MESSAGE };
  const locked = await planGate(admin, "table_games");
  if (locked) return { ok: false, message: locked };

  const enabled = formData.get("enabled") === "1";
  const chosen = formData.getAll("games").map(String);
  const games = TABLE_GAMES.map((game) => game.id).filter((id) => chosen.includes(id)) as TableGameId[];
  if (enabled && games.length === 0) return { ok: false, message: "En az bir oyun seçin ya da oyunları kapatın." };

  const { error } = await admin.supabase
    .from("restaurants")
    .update({ table_games: { enabled, games } })
    .eq("id", admin.restaurantId);

  if (error) {
    return {
      ok: false,
      message: /table_games/.test(error.message)
        ? "Masa oyunları için veritabanı güncellemesi bekleniyor. Lütfen OZT Digital ile iletişime geçin."
        : `Kaydedilemedi: ${error.message}`,
    };
  }

  revalidatePath("/admin/menu/oyunlar");
  revalidatePath("/restoran", "layout");
  return {
    ok: true,
    message: enabled
      ? "Kaydedildi. Masa oyunları müşterilerinize görünüyor."
      : "Kaydedildi. Masa oyunları kapalı; müşteriler göremez.",
  };
}
