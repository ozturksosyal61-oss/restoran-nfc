export type RestaurantTheme =
  | "classic"
  | "dark-modern"
  | "luxury-gold"
  | "ozt-glass-premium";

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
    description: "Koyu, modern ve teknoloji odaklı premium görünüm.",
    accent: "#29a9ff",
    surface: "#061019",
  },
  {
    value: "luxury-gold",
    label: "Luxury Gold",
    description: "Siyah, altın ve mermer hissi veren lüks tema.",
    accent: "#d5a72c",
    surface: "#090806",
  },
  {
    value: "ozt-glass-premium",
    label: "OZT App Premium",
    description: "Mobil uygulama hissi veren, görsel ağırlıklı premium restoran deneyimi.",
    accent: "#e4bd7a",
    surface: "#0b0b0d",
  },
];

export function normalizeRestaurantTheme(value: unknown): RestaurantTheme {
  if (value === "dark-modern") return "dark-modern";
  if (value === "luxury-gold") return "luxury-gold";
  if (value === "ozt-glass-premium") return "ozt-glass-premium";
  return "classic";
}

export function getRestaurantThemeMeta(value: unknown): RestaurantThemeMeta {
  const theme = normalizeRestaurantTheme(value);
  return (
    RESTAURANT_THEMES.find((item) => item.value === theme) ??
    RESTAURANT_THEMES[0]
  );
}
