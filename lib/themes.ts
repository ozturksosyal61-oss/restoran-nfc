export type RestaurantTheme =
  | "classic"
  | "dark-modern"
  | "luxury-gold"
  | "ozt-glass-premium"
  | "ozt-nova-premium"
  | "aurora"
  | "aurora-krem"
  | "aurora-gold"
  | "aurora-zeytin"
  | "aurora-bordo"
  | "aurora-lacivert"
  | "aurora-mermer";

export type RestaurantThemeMeta = {
  value: RestaurantTheme;
  label: string;
  description: string;
  accent: string;
  surface: string;
};

// Klasik temalardaki müşteri menüsünün yerleşimi (restaurants.menu_layout).
// Aurora temaları kendi düzenini kullanır. Yalnızca sistem panelinden değişir.
export const MENU_LAYOUTS = [
  { value: "classic", label: "Classic", description: "Sade, temiz ve zamansız menü." },
  { value: "editorial", label: "Editorial", description: "Dergi tarzı yerleşim." },
  { value: "grid", label: "Grid", description: "İki sütunlu ürün kartları." },
  { value: "luxury", label: "Luxury", description: "Koyu ve sofistike görünüm." },
  { value: "minimal", label: "Minimal", description: "Bol boşluklu, sade görünüm." },
] as const;

export const RESTAURANT_THEMES: readonly RestaurantThemeMeta[] = [
  {
    value: "classic",
    label: "Klasik",
    description: "Açık, sade ve zamansız restoran görünümü.",
    accent: "#b8943d",
    surface: "#faf9f6",
  },
  {
    value: "dark-modern",
    label: "Dark Modern",
    description:
      "Koyu, modern ve teknoloji odaklı premium görünüm.",
    accent: "#29a9ff",
    surface: "#061019",
  },
  {
    value: "luxury-gold",
    label: "Luxury Gold",
    description:
      "Siyah, altın ve mermer hissi veren lüks tema.",
    accent: "#d5a72c",
    surface: "#090806",
  },
  {
    value: "ozt-glass-premium",
    label: "OZT App Premium",
    description:
      "Mobil uygulama hissi veren, görsel ağırlıklı premium restoran deneyimi.",
    accent: "#e4bd7a",
    surface: "#0b0b0d",
  },
  {
    value: "ozt-nova-premium",
    label: "OZT Nova Premium",
    description:
      "Yeni nesil, modern ve farklı müşteri deneyimi için hazırlanan tema.",
    accent: "#d8a94f",
    surface: "#f6f2ea",
  },
  {
    value: "aurora",
    label: "AURORA - DARK",
    description:
      "Aurora'nın koyu, sinematik ve premium restoran deneyimi.",
    accent: "#e0c07c",
    surface: "#12100d",
  },
  {
    value: "aurora-krem",
    label: "AURORA - KREM",
    description:
      "Aurora tasarımının açık krem, ferah ve premium gündüz versiyonu.",
    accent: "#8a6424",
    surface: "#f4efe6",
  },
  {
    value: "aurora-gold",
    label: "AURORA - GOLD",
    description:
      "Aurora tasarımının daha belirgin altın vurgulara sahip premium versiyonu.",
    accent: "#edc979",
    surface: "#140e07",
  },
  {
    value: "aurora-zeytin",
    label: "AURORA - ZEYTİN",
    description:
      "Koyu zeytin yeşili zemin ve adaçayı vurgular; bahçe ve Ege mutfağına uygun.",
    accent: "#c5d29b",
    surface: "#10140f",
  },
  {
    value: "aurora-bordo",
    label: "AURORA - BORDO",
    description:
      "Şarap kırmızısı zemin ve gül altını vurgular; steakhouse ve şarap barlarına uygun.",
    accent: "#eab0a2",
    surface: "#170c0f",
  },
  {
    value: "aurora-lacivert",
    label: "AURORA - LACİVERT",
    description:
      "Gece mavisi zemin ve şampanya vurgular; balık ve deniz restoranlarına uygun.",
    accent: "#e7cd92",
    surface: "#0c1221",
  },
  {
    value: "aurora-mermer",
    label: "AURORA - MERMER",
    description:
      "Beyaz mermer zemin, siyah ve pirinç vurgular; kafe ve brunch mekânlarına uygun.",
    accent: "#7a6230",
    surface: "#f3f2ef",
  },
];

export function normalizeRestaurantTheme(
  value: unknown
): RestaurantTheme {
  const match = RESTAURANT_THEMES.find(
    (item) => item.value === value
  );

  return match ? match.value : "classic";
}

export function getRestaurantThemeMeta(
  value: unknown
): RestaurantThemeMeta {
  const theme = normalizeRestaurantTheme(value);
  return (
    RESTAURANT_THEMES.find(
      (item) => item.value === theme
    ) ?? RESTAURANT_THEMES[0]
  );
}

/* ---------------------------------------------------------
   AURORA RENK TEMALARI
   Aynı Aurora tasarımı; yalnızca renkler değişir. Renkler
   app/restoran/[slug]/aurora-palette.module.css içindedir.
   --------------------------------------------------------- */

export type AuroraPalette =
  | "dark"
  | "krem"
  | "gold"
  | "zeytin"
  | "bordo"
  | "lacivert"
  | "mermer";

const AURORA_PALETTES: Partial<Record<RestaurantTheme, AuroraPalette>> = {
  aurora: "dark",
  "aurora-krem": "krem",
  "aurora-gold": "gold",
  "aurora-zeytin": "zeytin",
  "aurora-bordo": "bordo",
  "aurora-lacivert": "lacivert",
  "aurora-mermer": "mermer",
};

// Aurora temalarından biri değilse null döner.
export function getAuroraPalette(value: unknown): AuroraPalette | null {
  return AURORA_PALETTES[normalizeRestaurantTheme(value)] ?? null;
}

export function isAuroraTheme(value: unknown): boolean {
  return getAuroraPalette(value) !== null;
}
