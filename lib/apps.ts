// Mobil uygulamalar vitrini: tür, durum etiketleri ve görsel adresi.
// Tablo: public.apps (supabase/migrations/20261106_apps.sql).

export type AppStatus = "yayinda" | "beta" | "yakinda" | "gizli";

export const APP_STATUSES: { value: AppStatus; label: string }[] = [
  { value: "yayinda", label: "Yayında" },
  { value: "beta", label: "Beta" },
  { value: "yakinda", label: "Çok yakında" },
  { value: "gizli", label: "Gizli" },
];

export const APP_BUCKET = "app-images";

export type AppEntry = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  icon_path: string | null;
  screenshots: string[];
  status: AppStatus;
  app_store_url: string | null;
  play_store_url: string | null;
  accent_color: string;
  privacy_url: string | null;
  support_url: string | null;
  sort_order: number;
};

export const APP_COLUMNS =
  "id, slug, name, tagline, description, icon_path, screenshots, status, app_store_url, play_store_url, accent_color, privacy_url, support_url, sort_order";

export function appImageUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${APP_BUCKET}/${path}`;
}

export function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function isHexColor(value: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

export function slugify(value: string) {
  return value
    .toLocaleLowerCase("tr")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
