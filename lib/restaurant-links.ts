// Müşteri ekranlarındaki restoran bağlantıları ve puan rozeti kuralları.

// Puan rozeti (ör. "4,8 · 12 değerlendirme") bu sayıdan az değerlendirmede gösterilmez;
// birkaç değerlendirmeyle "5.0" yanıltıcı olur.
export const MIN_REVIEWS_SHOWN = 5;

const HANDLE = /^[A-Za-z0-9._]{1,30}$/;
const RESERVED = new Set(["p", "reel", "reels", "explore", "accounts", "stories", "direct", "tv"]);

// İşletmenin girdiği Instagram bilgisi (kullanıcı adı, @ad ya da profil adresi)
// profil adresine çevrilir. Boş, yalnızca instagram.com ya da başka site ise null.
export function instagramProfileUrl(value: string | null | undefined): string | null {
  const raw = value?.trim();
  if (!raw) return null;

  const plain = raw.replace(/^@/, "");
  if (HANDLE.test(plain) && !plain.includes("..")) return `https://www.instagram.com/${plain}/`;

  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    if (!/(^|\.)instagram\.com$/i.test(url.hostname)) return null;
    const handle = url.pathname.split("/").filter(Boolean)[0] ?? "";
    if (!HANDLE.test(handle) || RESERVED.has(handle.toLowerCase())) return null;
    return `https://www.instagram.com/${handle}/`;
  } catch {
    return null;
  }
}
