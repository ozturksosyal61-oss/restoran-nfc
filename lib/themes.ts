export type RestaurantTheme =
  | "classic"
  | "dark-modern"
  | "luxury-gold"
  | "ozt-glass-premium"
  | "ozt-nova-premium"
  | "aurora";

export type RestaurantThemeMeta = {
  value: RestaurantTheme;
  label: string;
  description: string;
  accent: string;
  surface: string;
};

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
    label: "Aurora",
    description:
      "Modern, görsel odaklı ve interaktif yeni nesil restoran deneyimi.",
    accent: "#14b8a6",
    surface: "#f5f7f6",
  },
];

export function normalizeRestaurantTheme(
  value: unknown
): RestaurantTheme {
  if (value === "dark-modern") return "dark-modern";
  if (value === "luxury-gold") return "luxury-gold";
  if (value === "ozt-glass-premium") return "ozt-glass-premium";
  if (value === "ozt-nova-premium") return "ozt-nova-premium";
  if (value === "aurora") return "aurora";

  return "classic";
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