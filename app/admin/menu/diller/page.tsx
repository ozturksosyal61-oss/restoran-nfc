import Link from "next/link";
import { hasPlanFeature } from "../../../../lib/plan";
import { readRestaurantPlan } from "../../../../lib/plan-server";
import PlanLock from "../../PlanLock";
import { redirect } from "next/navigation";
import { getAdminRestaurant } from "../../../../lib/admin-restaurant";
import { aiConfigured } from "../../../../lib/ai";
import {
  currentTranslation,
  isMenuLanguage,
  languageMeta,
  normalizeLanguages,
  readTranslations,
  type MenuLanguage,
} from "../../../../lib/menu-i18n";
import { readMenuOnly } from "../../../../lib/restaurant-type";
import { isAuroraTheme } from "../../../../lib/themes";
import AdminIcon from "../../AdminIcon";
import { LanguagePicker, TranslateControls, TranslationRow } from "./LanguageForms";

// Çeviri işlemi birkaç yapay zekâ isteği yapar; varsayılan süre yetmeyebilir.
export const maxDuration = 300;

type Item = {
  id: number;
  name: string;
  description?: string | null;
  ingredients?: string | null;
  allergens?: string | null;
  translations?: unknown;
};

function statusOf(item: Item, language: MenuLanguage) {
  if (currentTranslation(item, language)) return "ok" as const;
  return readTranslations(item.translations)[language]?.name ? ("stale" as const) : ("missing" as const);
}

export default async function MenuLanguagesPage({
  searchParams,
}: {
  searchParams: Promise<{ dil?: string }>;
}) {
  const admin = await getAdminRestaurant();
  if (!admin) redirect("/admin/login");

  const { supabase, restaurantId } = admin;
  const { dil } = await searchParams;

  if (!hasPlanFeature(await readRestaurantPlan(supabase, Number(restaurantId)), "languages")) {
    return <PlanLock feature="languages" title="Menü dilleri" eyebrow="Menü" />;
  }

  const [{ data: restaurant, error: languageError }, { data: themeRow }, menuOnly] = await Promise.all([
    supabase.from("restaurants").select("menu_languages").eq("id", restaurantId).maybeSingle(),
    supabase.from("restaurants").select("theme").eq("id", restaurantId).maybeSingle(),
    readMenuOnly(supabase, restaurantId),
  ]);

  const columnMissing = Boolean(languageError);
  const languages = normalizeLanguages(restaurant?.menu_languages);

  const { data: categoryData } = await supabase
    .from("categories")
    .select("id, name, sort_order")
    .eq("restaurant_id", restaurantId)
    .order("sort_order", { ascending: true });

  const categories = (categoryData ?? []) as (Item & { sort_order: number })[];
  const categoryIds = categories.map((category) => category.id);

  const { data: productData } =
    categoryIds.length > 0
      ? await supabase
          .from("products")
          .select("id, category_id, name, description, ingredients, allergens, sort_order")
          .in("category_id", categoryIds)
          .order("sort_order", { ascending: true })
      : { data: [] };

  const products = (productData ?? []) as (Item & { category_id: number })[];

  // Çeviriler ayrı okunur; sütun yoksa sayfa yine açılır.
  if (!columnMissing) {
    const [categoryTranslations, productTranslations] = await Promise.all([
      categoryIds.length > 0
        ? supabase.from("categories").select("id, translations").in("id", categoryIds)
        : Promise.resolve({ data: [] as { id: number; translations: unknown }[] }),
      products.length > 0
        ? supabase.from("products").select("id, translations").in("id", products.map((product) => product.id))
        : Promise.resolve({ data: [] as { id: number; translations: unknown }[] }),
    ]);

    const categoryMap = new Map((categoryTranslations.data ?? []).map((row) => [row.id, row.translations]));
    const productMap = new Map((productTranslations.data ?? []).map((row) => [row.id, row.translations]));
    categories.forEach((category) => (category.translations = categoryMap.get(category.id)));
    products.forEach((product) => (product.translations = productMap.get(product.id)));
  }

  const allItems: Item[] = [...categories, ...products];
  const total = allItems.length;

  const progress = languages.map((code) => ({
    code,
    done: allItems.filter((item) => statusOf(item, code) === "ok").length,
  }));
  const hasPending = progress.some((entry) => entry.done < total);

  const reviewLanguage: MenuLanguage | null = isMenuLanguage(dil) && languages.includes(dil) ? dil : languages[0] ?? null;

  const aiInPlan = hasPlanFeature(await readRestaurantPlan(supabase, Number(restaurantId)), "ai");
  const ai = aiConfigured() && aiInPlan;
  const auroraShown = menuOnly || isAuroraTheme(themeRow?.theme);

  return (
    <main className="adm-page">
      <header className="adm-head">
        <div className="adm-head-text">
          <span className="adm-eyebrow">Menü</span>
          <h1>Menü dilleri</h1>
          <p>
            Yabancı misafirleriniz menünüzü kendi dillerinde okusun. Çeviriyi yapay zekâ yapar; isterseniz
            aşağıdan düzeltirsiniz. Misafir, menünün üstündeki dil düğmesiyle dilini seçer.
          </p>
        </div>
        <div className="adm-head-actions">
          <Link className="adm-btn" href="/admin/menu">
            <AdminIcon name="menu" size={16} />
            Ürünler
          </Link>
        </div>
      </header>

      {columnMissing && (
        <p className="adm-alert adm-alert-error" role="alert">
          <AdminIcon name="alert" size={16} />
          Bu özellik için veritabanı güncellemesi bekleniyor. Lütfen OZT Digital ile iletişime geçin.
        </p>
      )}

      {!auroraShown && (
        <p className="adm-alert adm-alert-info">
          <AdminIcon name="info" size={16} />
          Dil seçimi müşteriye Aurora temalarında gösterilir. Temanızı Aurora&apos;ya geçirmek için bizimle
          iletişime geçin.
        </p>
      )}

      <div className="adm-split">
        <section className="adm-card" aria-labelledby="diller-baslik">
          <div className="adm-card-head">
            <div>
              <h2 id="diller-baslik">Menü hangi dillerde görünsün?</h2>
              <p>Türkçe her zaman açıktır.</p>
            </div>
          </div>
          <LanguagePicker selected={languages} />
        </section>

        <section className="adm-card" aria-labelledby="ceviri-baslik">
          <div className="adm-card-head">
            <div>
              <h2 id="ceviri-baslik">Otomatik çeviri</h2>
              <p>
                {total} kayıt ({categories.length} kategori, {products.length} ürün). Ürünü değiştirdiğinizde
                çevirisi eskir ve menüde Türkçesi görünür; &quot;Eksik çevirileri tamamla&quot; ile yenileyin.
              </p>
            </div>
          </div>

          {languages.length === 0 ? (
            <div className="adm-empty">
              <span className="adm-empty-icon"><AdminIcon name="info" /></span>
              <strong>Henüz dil seçilmedi</strong>
              <p>Soldan en az bir dil seçip kaydedin.</p>
            </div>
          ) : (
            <>
              <ul className="adm-list adm-tr-progress">
                {progress.map((entry) => {
                  const percent = total === 0 ? 100 : Math.round((entry.done / total) * 100);
                  return (
                    <li key={entry.code} className="adm-row">
                      <span className="adm-row-main">
                        <strong>{languageMeta(entry.code).turkish}</strong>
                        <small>
                          {entry.done} / {total} güncel
                        </small>
                      </span>
                      <span className="adm-rating-track" aria-hidden="true">
                        <span style={{ width: `${percent}%` }} />
                      </span>
                      <span className={`adm-badge ${percent === 100 ? "s-ok" : "s-pending"}`}>%{percent}</span>
                    </li>
                  );
                })}
              </ul>

              {!ai && (
                <p className="adm-alert adm-alert-info">
                  <AdminIcon name="info" size={16} />
                  {aiInPlan
                    ? "Otomatik çeviri şu an kapalı. Çevirileri aşağıdan elle girebilirsiniz."
                    : "Otomatik çeviri (yapay zekâ) Premium paketinde. Çevirileri aşağıdan elle girebilirsiniz."}
                </p>
              )}

              <TranslateControls disabled={!ai || columnMissing || total === 0} hasPending={hasPending} />
            </>
          )}
        </section>
      </div>

      {reviewLanguage && total > 0 && !columnMissing && (
        <section className="adm-card" aria-labelledby="kontrol-baslik">
          <div className="adm-card-head">
            <div>
              <h2 id="kontrol-baslik">Çevirileri kontrol edin</h2>
              <p>Soldaki Türkçe metin, sağda {languageMeta(reviewLanguage).turkish} karşılığı.</p>
            </div>
          </div>

          {languages.length > 1 && (
            <nav className="adm-chips" aria-label="Dil seçin">
              {languages.map((code) => (
                <a
                  key={code}
                  className={`adm-chip ${code === reviewLanguage ? "is-active" : ""}`}
                  href={`/admin/menu/diller?dil=${code}`}
                  aria-current={code === reviewLanguage ? "page" : undefined}
                >
                  {languageMeta(code).turkish}
                </a>
              ))}
            </nav>
          )}

          {categories.map((category) => {
            const items = products.filter((product) => product.category_id === category.id);
            const categoryEntry = readTranslations(category.translations)[reviewLanguage];

            return (
              <div key={category.id} className="adm-tr-group">
                <ul className="adm-tr-list">
                  <TranslationRow
                    key={`c${category.id}-${reviewLanguage}-${categoryEntry?.name ?? ""}`}
                    kind="category"
                    id={category.id}
                    language={reviewLanguage}
                    sourceName={category.name}
                    sourceDescription={null}
                    name={categoryEntry?.name ?? ""}
                    description=""
                    status={statusOf(category, reviewLanguage)}
                  />
                  {items.map((product) => {
                    const entry = readTranslations(product.translations)[reviewLanguage];
                    return (
                      <TranslationRow
                        key={`p${product.id}-${reviewLanguage}-${entry?.name ?? ""}-${entry?.description ?? ""}`}
                        kind="product"
                        id={product.id}
                        language={reviewLanguage}
                        sourceName={product.name}
                        sourceDescription={product.description ?? null}
                        name={entry?.name ?? ""}
                        description={entry?.description ?? ""}
                        status={statusOf(product, reviewLanguage)}
                      />
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </section>
      )}
    </main>
  );
}
