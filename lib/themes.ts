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
  | "aurora-mermer"
  | "zest-kirmizi"
  | "zest-turuncu"
  | "zest-yesil"
  | "zest-mavi"
  | "linen-fildisi"
  | "linen-beyaz"
  | "linen-zeytin"
  | "linen-bordo"
  | "luna-nane"
  | "luna-amber"
  | "luna-mavi"
  | "luna-pembe";

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
  {
    value: "zest-kirmizi",
    label: "ZEST - KIRMIZI",
    description:
      "Büyük fotoğraflar, hızlı sepet; burgerci, fast food ve kafeler için iştah açan kırmızı.",
    accent: "#d7261e",
    surface: "#f6f3ee",
  },
  {
    value: "zest-turuncu",
    label: "ZEST - TURUNCU",
    description:
      "Zest tasarımı, sıcak turuncu vurgu; pizzacı, dönerci ve sokak lezzetleri için.",
    accent: "#c2410c",
    surface: "#f6f3ee",
  },
  {
    value: "zest-yesil",
    label: "ZEST - YEŞİL",
    description:
      "Zest tasarımı, taze yeşil vurgu; salata, bowl ve sağlıklı mutfak için.",
    accent: "#157a47",
    surface: "#f6f3ee",
  },
  {
    value: "zest-mavi",
    label: "ZEST - MAVİ",
    description:
      "Zest tasarımı, canlı mavi vurgu; kahve zincirleri ve modern kafeler için.",
    accent: "#2747c9",
    surface: "#f6f3ee",
  },
  {
    value: "linen-fildisi",
    label: "LINEN - FİLDİŞİ",
    description:
      "Tipografi ağırlıklı, sakin ve zarif; fildişi zemin, orman yeşili ve pirinç. Fine dining ve bistrolar için.",
    accent: "#74592f",
    surface: "#f3f1ea",
  },
  {
    value: "linen-beyaz",
    label: "LINEN - BEYAZ",
    description: "Linen tasarımı, beyaz zemin ve siyah yazı; modern ve minimal restoranlar için.",
    accent: "#141414",
    surface: "#ffffff",
  },
  {
    value: "linen-zeytin",
    label: "LINEN - ZEYTİN",
    description: "Linen tasarımı, zeytin yeşili tonlar; Ege ve Akdeniz mutfağı için.",
    accent: "#5a6630",
    surface: "#eeefe6",
  },
  {
    value: "linen-bordo",
    label: "LINEN - BORDO",
    description: "Linen tasarımı, şarap kırmızısı tonlar; meyhane, steakhouse ve şarap evleri için.",
    accent: "#7a1f2b",
    surface: "#f6f0ee",
  },
  {
    value: "luna-nane",
    label: "LUNA - NANE",
    description:
      "Koyu zemin, neon nane vurgu, öne çıkan masa oyunları; bar, pub ve kokteyl mekânları için.",
    accent: "#5ef2c2",
    surface: "#0f0e15",
  },
  {
    value: "luna-amber",
    label: "LUNA - AMBER",
    description: "Luna tasarımı, sıcak amber vurgu; viski barları ve pub'lar için.",
    accent: "#ffb84d",
    surface: "#0f0e15",
  },
  {
    value: "luna-mavi",
    label: "LUNA - MAVİ",
    description: "Luna tasarımı, soğuk mavi vurgu; lounge ve rooftop barlar için.",
    accent: "#8fa8ff",
    surface: "#0f0e15",
  },
  {
    value: "luna-pembe",
    label: "LUNA - PEMBE",
    description: "Luna tasarımı, neon pembe vurgu; kokteyl barları ve gece kulüpleri için.",
    accent: "#ff8cc0",
    surface: "#0f0e15",
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
  | "mermer"
  | "zest-kirmizi"
  | "zest-turuncu"
  | "zest-yesil"
  | "zest-mavi"
  | "linen-fildisi"
  | "linen-beyaz"
  | "linen-zeytin"
  | "linen-bordo"
  | "luna-nane"
  | "luna-amber"
  | "luna-mavi"
  | "luna-pembe";

const AURORA_PALETTES: Partial<Record<RestaurantTheme, AuroraPalette>> = {
  aurora: "dark",
  "aurora-krem": "krem",
  "aurora-gold": "gold",
  "aurora-zeytin": "zeytin",
  "aurora-bordo": "bordo",
  "aurora-lacivert": "lacivert",
  "aurora-mermer": "mermer",
  "zest-kirmizi": "zest-kirmizi",
  "zest-turuncu": "zest-turuncu",
  "zest-yesil": "zest-yesil",
  "zest-mavi": "zest-mavi",
  "linen-fildisi": "linen-fildisi",
  "linen-beyaz": "linen-beyaz",
  "linen-zeytin": "linen-zeytin",
  "linen-bordo": "linen-bordo",
  "luna-nane": "luna-nane",
  "luna-amber": "luna-amber",
  "luna-mavi": "luna-mavi",
  "luna-pembe": "luna-pembe",
};

// Aurora temalarından biri değilse null döner.
export function getAuroraPalette(value: unknown): AuroraPalette | null {
  return AURORA_PALETTES[normalizeRestaurantTheme(value)] ?? null;
}

export function isAuroraTheme(value: unknown): boolean {
  return getAuroraPalette(value) !== null;
}

/* ---------------------------------------------------------
   MENÜ TASARIMLARI
   Aurora ailesindeki her tema bir tasarıma ve bir renk paletine
   karşılık gelir. Ana sayfa ve menü tasarıma göre değişir; sipariş,
   takip, ödeme ve değerlendirme ekranları ortaktır ve paletin
   renklerini alır.
   --------------------------------------------------------- */

export type MenuDesign = "aurora" | "zest" | "linen" | "luna";

export const MENU_DESIGNS: readonly { value: MenuDesign; label: string; description: string }[] = [
  { value: "aurora", label: "Aurora", description: "Sinematik ve premium; her tür restoran için." },
  { value: "zest", label: "Zest", description: "Hızlı ve görsel; fast food, burgerci ve kafeler için." },
  { value: "linen", label: "Linen", description: "Sakin ve zarif; fine dining, bistro ve meyhaneler için." },
  { value: "luna", label: "Luna", description: "Koyu ve neon; bar, pub ve kokteyl mekânları için." },
];

// Aurora ailesinden olmayan (klasik, Nova) temalarda null döner.
export function getMenuDesign(value: unknown): MenuDesign | null {
  const theme = normalizeRestaurantTheme(value);
  if (!isAuroraTheme(theme)) return null;
  if (theme.startsWith("zest-")) return "zest";
  if (theme.startsWith("linen-")) return "linen";
  if (theme.startsWith("luna-")) return "luna";
  return "aurora";
}
