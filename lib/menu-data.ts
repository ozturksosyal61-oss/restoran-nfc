import { supabase } from "./supabase";
import { hasPlanFeature } from "./plan";
import { normalizeLanguages, type MenuLanguage } from "./menu-i18n";
import { readMenuOnly } from "./restaurant-type";

// Aurora menüsünün verisi sunucuda TEK sorguyla hazırlanır (restoran,
// kategoriler, ürünler, çeviriler, kalori). Böylece telefon veritabanına
// art arda sorgu göndermez; sayfa ürünleriyle birlikte gelir.
// Yeni sütunlardan biri yoksa (eski şema) daha sade sorguya düşülür.

export type MenuCategory = { id: number; name: string; translations?: unknown };
export type MenuProduct = {
  id: number;
  category_id: number;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  ingredients: string | null;
  allergens: string | null;
  translations?: unknown;
  calories?: number | null;
};
export type MenuData = {
  restaurant: { id: number; name: string; logo_url: string | null; is_open: boolean | null };
  theme: string | null;
  menuOnly: boolean;
  categories: MenuCategory[];
  products: MenuProduct[];
  languages: MenuLanguage[];
};

type RawProduct = MenuProduct & { sort_order?: number | null; is_available?: boolean | null };
type RawCategory = MenuCategory & { sort_order?: number | null; products?: RawProduct[] | null };
type RawRestaurant = {
  id: number;
  name: string;
  logo_url: string | null;
  is_open: boolean | null;
  theme: string | null;
  plan?: string | null;
  menu_only?: boolean | null;
  menu_languages?: unknown;
  categories?: RawCategory[] | null;
};

const FULL =
  "id, name, logo_url, is_open, theme, plan, menu_only, menu_languages, " +
  "categories(id, name, sort_order, translations, products(id, category_id, name, description, price, image_url, ingredients, allergens, sort_order, is_available, translations, calories))";

const BASIC =
  "id, name, logo_url, is_open, theme, plan, " +
  "categories(id, name, sort_order, products(id, category_id, name, description, price, image_url, ingredients, allergens, sort_order, is_available))";

const bySort = (a: { sort_order?: number | null; id: number }, b: { sort_order?: number | null; id: number }) =>
  (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.id - b.id;

export async function loadMenuData(slug: string): Promise<MenuData | null> {
  const read = (columns: string) =>
    supabase.from("restaurants").select(columns).eq("slug", slug).eq("is_active", true).maybeSingle();

  let { data, error } = await read(FULL);
  const legacy = Boolean(error);
  if (error) ({ data, error } = await read(BASIC));
  if (error || !data) return null;

  const raw = data as unknown as RawRestaurant;
  if (legacy) raw.menu_only = await readMenuOnly(supabase, Number(raw.id));
  const showCalories = hasPlanFeature(raw.plan, "calories");
  const categories = [...(raw.categories ?? [])].sort(bySort);

  const products: MenuProduct[] = [];
  for (const category of categories) {
    for (const product of [...(category.products ?? [])].sort(bySort)) {
      if (product.is_available === false) continue;
      products.push({
        id: Number(product.id),
        category_id: Number(product.category_id),
        name: product.name,
        description: product.description ?? null,
        price: Number(product.price),
        image_url: product.image_url ?? null,
        ingredients: product.ingredients ?? null,
        allergens: product.allergens ?? null,
        translations: product.translations,
        calories: showCalories ? product.calories ?? null : null,
      });
    }
  }

  return {
    restaurant: { id: Number(raw.id), name: raw.name, logo_url: raw.logo_url ?? null, is_open: raw.is_open ?? null },
    theme: raw.theme ?? null,
    // Başlangıç paketi sadece menüdür (menu_only paketten türetilir).
    menuOnly: raw.menu_only === true,
    categories: categories.map((category) => ({
      id: Number(category.id),
      name: category.name,
      translations: category.translations,
    })),
    products,
    languages: hasPlanFeature(raw.plan, "languages") ? normalizeLanguages(raw.menu_languages) : [],
  };
}
