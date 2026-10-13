import type { DisplayLanguage } from "./menu-i18n";

// Ürün etiketleri: TEK KAYNAK. Panel (ürün formu, toplu etiketleme),
// menü verisi ve dört menü tasarımı bu listeyi okur.
// Veritabanındaki izinli değerler: 20261031_product_tags.sql.
//
//   highlight: ürün kartında rozet (kampanya etiketiyle birlikte en fazla 2)
//   info:      ürün adının yanında küçük simge, detayda yazıyla

export const HIGHLIGHT_TAGS = ["new", "chef", "homemade", "sharing"] as const;
export const SPICY_TAGS = ["spicy_1", "spicy_2", "spicy_3"] as const;
export const DIET_TAGS = ["vegetarian", "vegan", "gluten_free", "lactose_free", "alcohol"] as const;

export type HighlightTag = (typeof HIGHLIGHT_TAGS)[number];
export type SpicyTag = (typeof SPICY_TAGS)[number];
export type DietTag = (typeof DIET_TAGS)[number];
export type ProductTag = HighlightTag | SpicyTag | DietTag;

// Satışlardan hesaplanır, kaydedilmez.
export type BadgeTag = HighlightTag | "best_seller";

const ALL_TAGS: readonly string[] = [...HIGHLIGHT_TAGS, ...SPICY_TAGS, ...DIET_TAGS];

export function isProductTag(value: unknown): value is ProductTag {
  return typeof value === "string" && ALL_TAGS.includes(value);
}

export function normalizeTags(value: unknown): ProductTag[] {
  if (!Array.isArray(value)) return [];
  const tags = value.filter(isProductTag);
  // Acılık tek seviyedir; birden fazlaysa en yükseği kalır.
  const spicy = SPICY_TAGS.filter((tag) => tags.includes(tag)).pop();
  return ALL_TAGS.filter(
    (tag): tag is ProductTag => tags.includes(tag as ProductTag) && (!tag.startsWith("spicy_") || tag === spicy)
  );
}

export function spicyLevel(tags: readonly string[]): 0 | 1 | 2 | 3 {
  if (tags.includes("spicy_3")) return 3;
  if (tags.includes("spicy_2")) return 2;
  if (tags.includes("spicy_1")) return 1;
  return 0;
}

// Türkiye saatine göre bugünün tarihi (YYYY-MM-DD).
export function todayInTurkey(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(now);
}

// "Yeni" etiketi bitiş günü geçtiyse düşer.
export function activeTags(tags: unknown, newUntil: string | null | undefined, today = todayInTurkey()) {
  const list = normalizeTags(tags);
  if (newUntil && newUntil < today) return list.filter((tag) => tag !== "new");
  return list;
}

/* ---------------- Adlar ---------------- */

type Labels = Record<ProductTag | "best_seller" | "not_spicy", string>;

const LABELS: Record<DisplayLanguage, Labels> = {
  tr: {
    new: "Yeni",
    chef: "Şefin önerisi",
    homemade: "Ev yapımı",
    sharing: "Paylaşımlık",
    best_seller: "Çok satan",
    spicy_1: "Az acılı",
    spicy_2: "Acılı",
    spicy_3: "Çok acılı",
    not_spicy: "Acısız",
    vegetarian: "Vejetaryen",
    vegan: "Vegan",
    gluten_free: "Glutensiz",
    lactose_free: "Laktozsuz",
    alcohol: "Alkollü",
  },
  en: {
    new: "New",
    chef: "Chef's pick",
    homemade: "Homemade",
    sharing: "For sharing",
    best_seller: "Best seller",
    spicy_1: "Mildly spicy",
    spicy_2: "Spicy",
    spicy_3: "Very spicy",
    not_spicy: "Not spicy",
    vegetarian: "Vegetarian",
    vegan: "Vegan",
    gluten_free: "Gluten-free",
    lactose_free: "Lactose-free",
    alcohol: "Contains alcohol",
  },
  de: {
    new: "Neu",
    chef: "Empfehlung des Küchenchefs",
    homemade: "Hausgemacht",
    sharing: "Zum Teilen",
    best_seller: "Bestseller",
    spicy_1: "Leicht scharf",
    spicy_2: "Scharf",
    spicy_3: "Sehr scharf",
    not_spicy: "Nicht scharf",
    vegetarian: "Vegetarisch",
    vegan: "Vegan",
    gluten_free: "Glutenfrei",
    lactose_free: "Laktosefrei",
    alcohol: "Enthält Alkohol",
  },
  ru: {
    new: "Новинка",
    chef: "Выбор шефа",
    homemade: "Домашнее",
    sharing: "Для компании",
    best_seller: "Хит продаж",
    spicy_1: "Слегка острое",
    spicy_2: "Острое",
    spicy_3: "Очень острое",
    not_spicy: "Неострое",
    vegetarian: "Вегетарианское",
    vegan: "Веганское",
    gluten_free: "Без глютена",
    lactose_free: "Без лактозы",
    alcohol: "Содержит алкоголь",
  },
  ar: {
    new: "جديد",
    chef: "اختيار الشيف",
    homemade: "صنع منزلي",
    sharing: "للمشاركة",
    best_seller: "الأكثر مبيعاً",
    spicy_1: "حار قليلاً",
    spicy_2: "حار",
    spicy_3: "حار جداً",
    not_spicy: "غير حار",
    vegetarian: "نباتي",
    vegan: "نباتي صرف",
    gluten_free: "خالٍ من الغلوتين",
    lactose_free: "خالٍ من اللاكتوز",
    alcohol: "يحتوي على كحول",
  },
  fr: {
    new: "Nouveau",
    chef: "Suggestion du chef",
    homemade: "Fait maison",
    sharing: "À partager",
    best_seller: "Best-seller",
    spicy_1: "Légèrement épicé",
    spicy_2: "Épicé",
    spicy_3: "Très épicé",
    not_spicy: "Non épicé",
    vegetarian: "Végétarien",
    vegan: "Végan",
    gluten_free: "Sans gluten",
    lactose_free: "Sans lactose",
    alcohol: "Contient de l'alcool",
  },
};

export function tagLabel(tag: keyof Labels, language: DisplayLanguage = "tr") {
  return (LABELS[language] ?? LABELS.tr)[tag];
}

// Menüdeki uyarı: diyet beyanı işletmenindir.
const DIET_NOTICE: Record<DisplayLanguage, string> = {
  tr: "Bu bilgiler işletme tarafından verilmiştir. Alerjiniz varsa lütfen personele danışın.",
  en: "This information is provided by the restaurant. If you have an allergy, please ask our staff.",
  de: "Diese Angaben stammen vom Restaurant. Bei Allergien wenden Sie sich bitte an unser Personal.",
  ru: "Информация предоставлена заведением. При аллергии, пожалуйста, обратитесь к персоналу.",
  ar: "هذه المعلومات مقدمة من المطعم. إذا كانت لديك حساسية، يرجى سؤال الموظفين.",
  fr: "Ces informations sont fournies par le restaurant. En cas d'allergie, adressez-vous au personnel.",
};

export function dietNotice(language: DisplayLanguage = "tr") {
  return DIET_NOTICE[language] ?? DIET_NOTICE.tr;
}

const FILTER_TITLE: Record<DisplayLanguage, string> = {
  tr: "Beslenme tercihi",
  en: "Dietary preference",
  de: "Ernährungsweise",
  ru: "Предпочтения в питании",
  ar: "التفضيل الغذائي",
  fr: "Préférence alimentaire",
};

export function filterTitle(language: DisplayLanguage = "tr") {
  return FILTER_TITLE[language] ?? FILTER_TITLE.tr;
}

const DETAILS_TITLE: Record<DisplayLanguage, string> = {
  tr: "Özellikler",
  en: "Highlights",
  de: "Merkmale",
  ru: "Особенности",
  ar: "المميزات",
  fr: "Caractéristiques",
};

export function detailsTitle(language: DisplayLanguage = "tr") {
  return DETAILS_TITLE[language] ?? DETAILS_TITLE.tr;
}

/* ---------------- Menüde gösterim ---------------- */

// Rozet sırası: (kampanya) > Yeni > Şefin önerisi > Çok satan > Ev yapımı > Paylaşımlık
const BADGE_ORDER: BadgeTag[] = ["new", "chef", "best_seller", "homemade", "sharing"];

export const MAX_BADGES = 2;

// Kartta gösterilecek rozetler; kampanya etiketi varsa bir yer onundur.
export function cardBadges(
  product: { tags?: readonly string[] | null; bestSeller?: boolean; promo?: unknown },
  limit = MAX_BADGES
): BadgeTag[] {
  const tags = product.tags ?? [];
  const room = Math.max(0, limit - (product.promo ? 1 : 0));
  return BADGE_ORDER.filter((tag) =>
    tag === "best_seller" ? Boolean(product.bestSeller) : tags.includes(tag)
  ).slice(0, room);
}

export function infoTags(tags: readonly string[] | null | undefined): (SpicyTag | DietTag)[] {
  const list = tags ?? [];
  return [...SPICY_TAGS, ...DIET_TAGS].filter((tag) => list.includes(tag));
}

/* ---------------- Menü filtresi ---------------- */

export type DietFilterKey = "vegetarian" | "vegan" | "gluten_free" | "lactose_free" | "not_spicy";

export const DIET_FILTERS: DietFilterKey[] = ["vegetarian", "vegan", "gluten_free", "lactose_free", "not_spicy"];

export function matchesDiet(tags: readonly string[] | null | undefined, filter: DietFilterKey) {
  const list = tags ?? [];
  if (filter === "not_spicy") return spicyLevel(list) === 0;
  // Vegan ürün vejetaryendir.
  if (filter === "vegetarian") return list.includes("vegetarian") || list.includes("vegan");
  return list.includes(filter);
}

// Menüde işe yarayan filtreler: en az bir ürünü ayıran (Acısız için menüde
// acılı ürün olmalı).
export function usefulFilters(products: { tags?: readonly string[] | null }[]): DietFilterKey[] {
  return DIET_FILTERS.filter((filter) => {
    if (filter === "not_spicy") return products.some((product) => spicyLevel(product.tags ?? []) > 0);
    return products.some((product) => matchesDiet(product.tags, filter));
  });
}
