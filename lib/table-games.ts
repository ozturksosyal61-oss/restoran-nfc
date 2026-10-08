import { hasPlanFeature } from "./plan";

// Masa oyunları: hangi oyunlar var, restoranın ayarı ve müşteriye
// gösterilip gösterilmeyeceği. Oyunların kendisi tarayıcıda çalışır.

export const TABLE_GAMES = [
  {
    id: "anlat",
    name: "Anlat Bakalım",
    short: "Yasaklı kelimeleri söylemeden anlat, masan bilsin.",
    players: "2+ kişi",
  },
  {
    id: "refleks",
    name: "En Hızlı Parmak",
    short: "Ekran yeşile dönünce ilk dokunan kazanır.",
    players: "2–4 kişi",
  },
] as const;

export type TableGameId = (typeof TABLE_GAMES)[number]["id"];

export type TableGamesSetting = { enabled: boolean; games: TableGameId[] };

const ALL_IDS = TABLE_GAMES.map((game) => game.id) as TableGameId[];

export function normalizeTableGames(raw: unknown): TableGamesSetting {
  const value = raw && typeof raw === "object" ? (raw as { enabled?: unknown; games?: unknown }) : {};
  const games = Array.isArray(value.games)
    ? ALL_IDS.filter((id) => (value.games as unknown[]).includes(id))
    : ALL_IDS;
  return { enabled: value.enabled === true, games };
}

// Müşteriye gösterilecek oyunlar: ayar açık, paket uygun ve restoran
// "sadece menü" değilse. Aksi hâlde boş liste (hiçbir yerde görünmez).
export function visibleTableGames(raw: unknown, plan: unknown, menuOnly: boolean): TableGameId[] {
  if (menuOnly || !hasPlanFeature(plan, "table_games")) return [];
  const setting = normalizeTableGames(raw);
  return setting.enabled ? setting.games : [];
}
