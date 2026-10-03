// Menü açılış duyurusu (restaurants.menu_popup). Panelde kaydederken ve
// müşteri ekranında gösterirken aynı temizleme kullanılır; veritabanına
// elle yazılmış hatalı ya da zararlı bir değer de ekrana ulaşmaz.

export type PopupLinkType = "none" | "category" | "instagram" | "url";
export type PopupFrequency = "every" | "daily" | "once";

export type MenuPopup = {
  enabled: boolean;
  title: string;
  text: string;
  imageUrl: string | null;
  buttonLabel: string;
  linkType: PopupLinkType;
  categoryId: number | null;
  url: string | null;
  frequency: PopupFrequency;
  startsOn: string | null; // YYYY-MM-DD (Türkiye saati)
  endsOn: string | null;
  version: string; // her kayıtta değişir; "bir kez" gösterimi sıfırlanır
};

export const POPUP_LIMITS = { title: 60, text: 240, button: 30, url: 300 };

export const EMPTY_POPUP: MenuPopup = {
  enabled: false,
  title: "",
  text: "",
  imageUrl: null,
  buttonLabel: "",
  linkType: "none",
  categoryId: null,
  url: null,
  frequency: "daily",
  startsOn: null,
  endsOn: null,
  version: "",
};

function text(value: unknown, max: number) {
  return String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

// Yalnızca https adresleri (ör. Instagram, web sitesi, rezervasyon sayfası).
export function safeUrl(value: unknown): string | null {
  const raw = String(value ?? "").trim();
  if (!raw || raw.length > POPUP_LIMITS.url) return null;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function day(value: unknown) {
  const raw = String(value ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
}

export function normalizePopup(value: unknown): MenuPopup {
  if (!value || typeof value !== "object") return EMPTY_POPUP;
  const raw = value as Record<string, unknown>;
  const linkType: PopupLinkType = ["category", "instagram", "url"].includes(String(raw.linkType))
    ? (raw.linkType as PopupLinkType)
    : "none";
  const frequency: PopupFrequency = ["every", "once"].includes(String(raw.frequency))
    ? (raw.frequency as PopupFrequency)
    : "daily";
  const categoryId = Number(raw.categoryId);

  return {
    enabled: raw.enabled === true,
    title: text(raw.title, POPUP_LIMITS.title),
    text: text(raw.text, POPUP_LIMITS.text),
    imageUrl: safeUrl(raw.imageUrl),
    buttonLabel: text(raw.buttonLabel, POPUP_LIMITS.button),
    linkType,
    categoryId: Number.isInteger(categoryId) && categoryId > 0 ? categoryId : null,
    url: safeUrl(raw.url),
    frequency,
    startsOn: day(raw.startsOn),
    endsOn: day(raw.endsOn),
    version: text(raw.version, 40),
  };
}

// Bugünün tarihi (Türkiye saati), YYYY-MM-DD.
export function todayInTurkey(now = Date.now()) {
  return new Date(now + 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function popupIsLive(popup: MenuPopup, today: string) {
  if (!popup.enabled || (!popup.title && !popup.text && !popup.imageUrl)) return false;
  if (popup.startsOn && today < popup.startsOn) return false;
  if (popup.endsOn && today > popup.endsOn) return false;
  return true;
}
