// Saha satış: aşamalar, etiketler ve yardımcılar (sunucu ve tarayıcı ortak).

export const STAGES = [
  { value: "yeni", label: "Yeni", tone: "s-pending" },
  { value: "gorusuldu", label: "Görüşüldü", tone: "s-accepted" },
  { value: "ilgileniyor", label: "İlgileniyor", tone: "s-preparing" },
  { value: "teklif", label: "Teklif verildi", tone: "s-ready" },
  { value: "demo", label: "Demo kuruldu", tone: "s-accent" },
  { value: "kazanildi", label: "Kazanıldı", tone: "s-ok" },
  { value: "kaybedildi", label: "Kaybedildi", tone: "s-danger" },
] as const;
export type Stage = (typeof STAGES)[number]["value"];

export const OPEN_STAGES: Stage[] = ["yeni", "gorusuldu", "ilgileniyor", "teklif", "demo"];

export const BUSINESS_TYPES = [
  { value: "kafe", label: "Kafe" },
  { value: "restoran", label: "Restoran" },
  { value: "pastane", label: "Pastane" },
  { value: "bar", label: "Bar" },
  { value: "otel", label: "Otel restoranı" },
  { value: "diger", label: "Diğer" },
] as const;

export const CURRENT_MENUS = [
  { value: "basili", label: "Basılı menü" },
  { value: "kendi_qr", label: "Kendi QR menüsü" },
  { value: "rakip", label: "Rakip firma" },
  { value: "yok", label: "Menü yok" },
  { value: "bilinmiyor", label: "Bilinmiyor" },
] as const;

export const LOST_REASONS = [
  { value: "fiyat", label: "Fiyat" },
  { value: "rakip", label: "Rakip firmayı seçti" },
  { value: "ilgisiz", label: "İlgilenmiyor" },
  { value: "zaten_var", label: "Mevcut sisteminden memnun" },
  { value: "karar_verici_yok", label: "Karar vericiye ulaşılamadı" },
  { value: "kapandi", label: "İşletme kapandı" },
  { value: "diger", label: "Diğer" },
] as const;

export const INTERESTS = [
  { value: "sicak", label: "Sıcak", tone: "s-danger" },
  { value: "ilik", label: "Ilık", tone: "s-pending" },
  { value: "soguk", label: "Soğuk", tone: "s-delivered" },
] as const;
export type Interest = (typeof INTERESTS)[number]["value"];

export const CHANNELS = [
  { value: "yuz_yuze", label: "Yüz yüze" },
  { value: "telefon", label: "Telefon" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "sistem", label: "Sistem" },
] as const;

export const OFFER_PLANS = [
  { value: "starter", label: "Başlangıç" },
  { value: "pro", label: "Pro" },
  { value: "premium", label: "Premium" },
] as const;

export type Lead = {
  id: number;
  name: string;
  business_type: string;
  district: string | null;
  address: string | null;
  table_count: number | null;
  contact_name: string | null;
  contact_role: string | null;
  phone: string | null;
  instagram: string | null;
  current_menu: string;
  competitor: string | null;
  stage: Stage;
  lost_reason: string | null;
  interest: Interest | null;
  latitude: number | null;
  longitude: number | null;
  offer_plan: string | null;
  offer_price: number | null;
  offer_note: string | null;
  next_action_at: string | null;
  next_action: string | null;
  photos: string[];
  demo_restaurant_id: number | null;
  restaurant_id: number | null;
  note: string | null;
  created_at: string;
  updated_at: string;
};

export type Visit = {
  id: number;
  lead_id: number;
  channel: string;
  interest: Interest | null;
  note: string;
  next_step: string | null;
  created_at: string;
};

export const LEAD_COLUMNS =
  "id, name, business_type, district, address, table_count, contact_name, contact_role, phone, instagram, current_menu, competitor, stage, lost_reason, interest, latitude, longitude, offer_plan, offer_price, offer_note, next_action_at, next_action, photos, demo_restaurant_id, restaurant_id, note, created_at, updated_at";

export function labelOf(list: readonly { value: string; label: string }[], value: string | null | undefined) {
  return list.find((item) => item.value === value)?.label ?? "";
}

export function stageOf(value: string) {
  return STAGES.find((stage) => stage.value === value) ?? STAGES[0];
}

export function interestOf(value: string | null | undefined) {
  return INTERESTS.find((interest) => interest.value === value) ?? null;
}

// Telefon: yalnızca rakamlar. Türkiye numarası 90 ile başlayacak biçime getirilir.
export function phoneDigits(value: string | null | undefined) {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("90") && digits.length === 12) return digits;
  if (digits.startsWith("0") && digits.length === 11) return `9${digits}`;
  if (digits.length === 10 && digits.startsWith("5")) return `90${digits}`;
  return digits;
}

export function telLink(phone: string | null | undefined) {
  const digits = phoneDigits(phone);
  return digits ? `tel:+${digits}` : null;
}

export function whatsappLink(phone: string | null | undefined, text: string) {
  const digits = phoneDigits(phone);
  return digits ? `https://wa.me/${digits}?text=${encodeURIComponent(text)}` : null;
}

export function mapsLink(lead: Pick<Lead, "latitude" | "longitude" | "address" | "district" | "name">) {
  if (lead.latitude != null && lead.longitude != null) {
    return `https://www.google.com/maps/search/?api=1&query=${lead.latitude},${lead.longitude}`;
  }
  const query = [lead.name, lead.address, lead.district].filter(Boolean).join(", ");
  return query ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}` : null;
}

export function instagramLink(value: string | null | undefined) {
  const handle = String(value ?? "")
    .trim()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
    .replace(/^@/, "")
    .replace(/\/.*$/, "");
  return handle ? `https://www.instagram.com/${handle}/` : null;
}

// İstanbul saatine göre bugünün sonu (takip listesi için).
export function endOfTodayIstanbul(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return new Date(`${parts}T23:59:59+03:00`);
}

export function formatDay(value: string | null | undefined) {
  if (!value) return "";
  return new Date(value).toLocaleString("tr-TR", {
    timeZone: "Europe/Istanbul",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatLira(value: number | null | undefined) {
  if (value == null) return "";
  return `${Number(value).toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ₺`;
}

// WhatsApp için hazır tanıtım mesajı.
export function introMessage(lead: Pick<Lead, "name" | "contact_name">, demoUrl: string) {
  const greeting = lead.contact_name ? `Merhaba ${lead.contact_name},` : "Merhaba,";
  return (
    `${greeting} OZT Digital'den yazıyorum. ${lead.name} için konuştuğumuz QR ve NFC dijital menüyü buradan ` +
    `inceleyebilirsiniz:\n${demoUrl}\n\nMenüyü telefonda açıp sipariş vermeyi ve garson çağırmayı deneyebilirsiniz. ` +
    "Sorularınız için buradan yazabilirsiniz."
  );
}
