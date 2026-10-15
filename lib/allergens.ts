import type { DisplayLanguage } from "./menu-i18n";

// 14 standart alerjen (AB 1169/2011 listesi): TEK KAYNAK. Ürünlerde kod
// olarak saklanır (products.allergen_codes, 20261104_customer_menu_fixes.sql),
// menüde her dilde bu sözlükten gösterilir; çeviriye gönderilmez.

export const ALLERGEN_CODES = [
  "gluten",
  "crustaceans",
  "eggs",
  "fish",
  "peanuts",
  "soy",
  "milk",
  "nuts",
  "celery",
  "mustard",
  "sesame",
  "sulphites",
  "lupin",
  "molluscs",
] as const;

export type AllergenCode = (typeof ALLERGEN_CODES)[number];

const LABELS: Record<DisplayLanguage, Record<AllergenCode, string>> = {
  tr: {
    gluten: "Gluten",
    crustaceans: "Kabuklu deniz ürünleri",
    eggs: "Yumurta",
    fish: "Balık",
    peanuts: "Yer fıstığı",
    soy: "Soya",
    milk: "Süt",
    nuts: "Sert kabuklu yemişler",
    celery: "Kereviz",
    mustard: "Hardal",
    sesame: "Susam",
    sulphites: "Sülfit",
    lupin: "Acı bakla",
    molluscs: "Yumuşakçalar",
  },
  en: {
    gluten: "Gluten",
    crustaceans: "Crustaceans",
    eggs: "Eggs",
    fish: "Fish",
    peanuts: "Peanuts",
    soy: "Soy",
    milk: "Milk",
    nuts: "Tree nuts",
    celery: "Celery",
    mustard: "Mustard",
    sesame: "Sesame",
    sulphites: "Sulphites",
    lupin: "Lupin",
    molluscs: "Molluscs",
  },
  de: {
    gluten: "Gluten",
    crustaceans: "Krebstiere",
    eggs: "Eier",
    fish: "Fisch",
    peanuts: "Erdnüsse",
    soy: "Soja",
    milk: "Milch",
    nuts: "Schalenfrüchte",
    celery: "Sellerie",
    mustard: "Senf",
    sesame: "Sesam",
    sulphites: "Sulfite",
    lupin: "Lupinen",
    molluscs: "Weichtiere",
  },
  ru: {
    gluten: "Глютен",
    crustaceans: "Ракообразные",
    eggs: "Яйца",
    fish: "Рыба",
    peanuts: "Арахис",
    soy: "Соя",
    milk: "Молоко",
    nuts: "Орехи",
    celery: "Сельдерей",
    mustard: "Горчица",
    sesame: "Кунжут",
    sulphites: "Сульфиты",
    lupin: "Люпин",
    molluscs: "Моллюски",
  },
  ar: {
    gluten: "الغلوتين",
    crustaceans: "القشريات",
    eggs: "البيض",
    fish: "السمك",
    peanuts: "الفول السوداني",
    soy: "الصويا",
    milk: "الحليب",
    nuts: "المكسرات",
    celery: "الكرفس",
    mustard: "الخردل",
    sesame: "السمسم",
    sulphites: "الكبريتيت",
    lupin: "الترمس",
    molluscs: "الرخويات",
  },
  fr: {
    gluten: "Gluten",
    crustaceans: "Crustacés",
    eggs: "Œufs",
    fish: "Poisson",
    peanuts: "Arachides",
    soy: "Soja",
    milk: "Lait",
    nuts: "Fruits à coque",
    celery: "Céleri",
    mustard: "Moutarde",
    sesame: "Sésame",
    sulphites: "Sulfites",
    lupin: "Lupin",
    molluscs: "Mollusques",
  },
};

export function isAllergenCode(value: unknown): value is AllergenCode {
  return typeof value === "string" && (ALLERGEN_CODES as readonly string[]).includes(value);
}

// Bilinen kodlar, standart sırayla.
export function normalizeAllergens(value: unknown): AllergenCode[] {
  if (!Array.isArray(value)) return [];
  return ALLERGEN_CODES.filter((code) => value.includes(code));
}

export function allergenLabel(code: AllergenCode, language: DisplayLanguage = "tr") {
  return (LABELS[language] ?? LABELS.tr)[code];
}

// Eski serbest metin sütununa yazılan Türkçe karşılık (geriye dönük uyum).
export function allergenText(codes: readonly AllergenCode[]) {
  return codes.map((code) => LABELS.tr[code]).join(", ");
}
