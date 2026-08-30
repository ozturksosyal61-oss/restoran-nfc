export type RestaurantTheme = "classic" | "dark-modern" | "luxury-gold";

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
];

export function normalizeRestaurantTheme(value: unknown): RestaurantTheme {
  if (value === "dark-modern") return "dark-modern";
  if (value === "luxury-gold") return "luxury-gold";
  return "classic";
}

export function getRestaurantThemeMeta(value: unknown): RestaurantThemeMeta {
  const theme = normalizeRestaurantTheme(value);
  return (
    RESTAURANT_THEMES.find((item) => item.value === theme) ??
    RESTAURANT_THEMES[0]
  );
}
