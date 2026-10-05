"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "../../../../lib/supabase/client";
import AuroraIcon, { type AuroraIconName } from "../AuroraIcon";
import {
  formatLira,
  readLastOrderId,
  readSavedTableToken,
  sendTableRequest,
  splitList,
  type TableRequestType,
} from "../aurora-utils";
import {
  MENU_LANGUAGES,
  isRtl,
  localize,
  menuStrings,
  normalizeLanguages,
  type DisplayLanguage,
  type MenuLanguage,
  type MenuStrings,
} from "../../../../lib/menu-i18n";
import { trackMenuView, trackProductView } from "../../../../lib/menu-tracking";
import { hasPlanFeature } from "../../../../lib/plan";
import type { MenuData } from "../../../../lib/menu-data";
import { applyPromotions, readMenuPromotions, type ProductPromo } from "../../../../lib/menu-promotions";
import { useCart } from "./CartContext";
import styles from "./AuroraMenu.module.css";

const LANGUAGE_STORAGE_KEY = "ozt_menu_language";

// Müşterinin daha önce seçtiği ya da tarayıcısının dili, menüde varsa.
function preferredLanguage(available: MenuLanguage[]): DisplayLanguage {
  if (available.length === 0) return "tr";

  try {
    const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (saved === "tr") return "tr";
    if (saved && available.includes(saved as MenuLanguage)) return saved as MenuLanguage;
  } catch {
    // Tarayıcı depolaması kapalı olabilir.
  }

  for (const tag of navigator.languages ?? [navigator.language]) {
    const code = tag.slice(0, 2).toLowerCase();
    if (code === "tr") return "tr";
    if (available.includes(code as MenuLanguage)) return code as MenuLanguage;
  }

  return "tr";
}

// Çeviriler ayrı sorguyla okunur; sütun henüz yoksa menü Türkçe açılır.
async function loadTranslations(
  supabase: ReturnType<typeof createClient>,
  table: "categories" | "products",
  ids: number[]
) {
  if (ids.length === 0) return new Map<number, unknown>();
  const { data, error } = await supabase.from(table).select("id, translations").in("id", ids);
  if (error) return new Map<number, unknown>();
  return new Map((data ?? []).map((row) => [Number(row.id), row.translations as unknown]));
}

// Renkler ve yazı tipleri restoran kabuğundan (layout.tsx) gelir;
// her Aurora renk teması aynı menüyü kullanır.

type Category = {
  id: number;
  name: string;
  translations?: unknown;
};

type Product = {
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
  // Aktif kampanya varsa price indirimli fiyattır.
  promo?: ProductPromo | null;
};

type Restaurant = {
  id: number;
  name: string;
  logo_url: string | null;
  is_open: boolean | null;
};

type Table = { token: string; number: number };

type Toast = { text: string; tone: "ok" | "error" };

type CartApi = ReturnType<typeof useCart>;

function smoothBehavior(): ScrollBehavior {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? "auto"
    : "smooth";
}

// menuOnly: "sadece menü" restoranı. Sepet, sipariş, garson çağırma, ödeme
// ve masa kodu yoktur; müşteri yalnızca ürünleri ve fiyatları görür.
export default function AuroraMenu({
  slug,
  menuOnly = false,
  initialData = null,
}: {
  slug: string;
  menuOnly?: boolean;
  // Sunucuda hazırlanan menü; varsa sayfa ürünleriyle birlikte açılır ve
  // telefon menüyü yeniden sorgulamaz.
  initialData?: MenuData | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlToken = searchParams.get("masa")?.trim() || "";
  const cart = useCart();

  const [restaurant, setRestaurant] = useState<Restaurant | null>(initialData?.restaurant ?? null);
  const [categories, setCategories] = useState<Category[]>(initialData?.categories ?? []);
  const [products, setProducts] = useState<Product[]>(initialData?.products ?? []);
  const [table, setTable] = useState<Table | null>(null);
  const [lastOrderId, setLastOrderId] = useState("");
  const [loading, setLoading] = useState(!initialData);
  const [loadError, setLoadError] = useState("");

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [openProduct, setOpenProduct] = useState<Product | null>(null);
  const [sheet, setSheet] = useState<"cart" | "service" | "language" | null>(null);
  const [languages, setLanguages] = useState<MenuLanguage[]>(initialData?.languages ?? []);
  const [language, setLanguage] = useState<DisplayLanguage>("tr");
  const t = menuStrings(language);
  const [toast, setToast] = useState<Toast | null>(null);
  const [pendingRequest, setPendingRequest] = useState<TableRequestType | null>(null);
  const [sentRequests, setSentRequests] = useState<TableRequestType[]>([]);

  const chipsRef = useRef<HTMLDivElement>(null);

  // Yükleme bittiğinde sepetin güncel hâline bakmak için.
  const cartRef = useRef(cart);
  useEffect(() => {
    cartRef.current = cart;
  });

  /* ---------------- Veri ---------------- */

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const supabase = createClient();

        // Sunucudan gelen menü varsa yalnızca masa kodu doğrulanır.
        if (initialData) {
          await finish(supabase, initialData.restaurant, initialData.categories, initialData.products, initialData.languages);
          return;
        }

        const { data: restaurantData } = await supabase
          .from("restaurants")
          .select("id, name, logo_url, is_open")
          .eq("slug", slug)
          .eq("is_active", true)
          .maybeSingle();

        if (!restaurantData) {
          if (!cancelled) setLoadError(menuStrings("tr").notFound);
          return;
        }

        const { data: categoryData } = await supabase
          .from("categories")
          .select("id, name, sort_order")
          .eq("restaurant_id", restaurantData.id)
          .order("sort_order", { ascending: true });

        const safeCategories = (categoryData ?? []) as Category[];
        let safeProducts: Product[] = [];

        if (safeCategories.length > 0) {
          const { data: productData } = await supabase
            .from("products")
            .select(
              "id, category_id, name, description, price, image_url, ingredients, allergens, sort_order"
            )
            .in("category_id", safeCategories.map((category) => category.id))
            .eq("is_available", true)
            .order("sort_order", { ascending: true });

          safeProducts = (productData ?? []) as Product[];
          safeProducts = applyPromotions(
            safeProducts.map((product) => ({ ...product, price: Number(product.price) })),
            await readMenuPromotions(supabase, Number(restaurantData.id))
          );
        }

        // Çok dilli menü: sütunlar henüz yoksa her şey Türkçe kalır.
        const [languageResult, categoryTranslations, productTranslations, calorieResult] = await Promise.all([
          supabase.from("restaurants").select("menu_languages, plan").eq("id", restaurantData.id).maybeSingle(),
          loadTranslations(supabase, "categories", safeCategories.map((category) => category.id)),
          loadTranslations(supabase, "products", safeProducts.map((product) => product.id)),
          // Kalori sütunu henüz yoksa sessizce atlanır.
          safeProducts.length > 0
            ? supabase.from("products").select("id, calories").in("id", safeProducts.map((product) => product.id))
            : Promise.resolve({ data: [], error: null }),
        ]);

        // Paket: çok dilli menü Pro'da, kalori Premium'da.
        const plan = languageResult.error ? null : languageResult.data?.plan;
        const calories = calorieResult.error || !hasPlanFeature(plan, "calories")
          ? new Map<number, number | null>()
          : new Map(
              ((calorieResult.data ?? []) as { id: number; calories: number | null }[]).map((row) => [
                Number(row.id),
                row.calories,
              ])
            );

        const availableLanguages = languageResult.error || !hasPlanFeature(plan, "languages")
          ? []
          : normalizeLanguages(languageResult.data?.menu_languages);

        safeCategories.forEach((category) => {
          category.translations = categoryTranslations.get(category.id);
        });
        safeProducts.forEach((product) => {
          product.translations = productTranslations.get(product.id);
          product.calories = calories.get(product.id) ?? null;
        });

        await finish(supabase, restaurantData as Restaurant, safeCategories, safeProducts, availableLanguages);
      } catch (error) {
        console.error("Aurora menü yüklenemedi:", error);
        if (!cancelled) setLoadError(menuStrings("tr").loadError);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    // Menü verisi hazır olduktan sonra: masa kodu, dil, açılış sayımı, sepet.
    async function finish(
      supabase: ReturnType<typeof createClient>,
      restaurantData: Restaurant,
      safeCategories: Category[],
      safeProducts: Product[],
      availableLanguages: MenuLanguage[]
    ) {
      {
        // Masa yalnızca QR/NFC kodu bu restoranla eşleşirse kabul edilir.
        const token = menuOnly ? "" : urlToken || readSavedTableToken();
        let nextTable: Table | null = null;

        if (token) {
          const { data: tableData } = await supabase.rpc("get_public_table", {
            p_restaurant_id: restaurantData.id,
            p_public_token: token,
          });

          if (tableData) {
            nextTable = {
              token: String(tableData.public_token),
              number: Number(tableData.table_number),
            };
            try {
              window.localStorage.setItem("ozt_table_token", nextTable.token);
            } catch {
              // Tarayıcı depolaması kapalı olabilir.
            }
          } else if (urlToken) {
            try {
              window.localStorage.removeItem("ozt_table_token");
            } catch {
              // Tarayıcı depolaması kapalı olabilir.
            }
          }
        }

        if (cancelled) return;

        const initialLanguage = preferredLanguage(availableLanguages);

        setRestaurant(restaurantData as Restaurant);
        trackMenuView(Number(restaurantData.id), initialLanguage);
        setCategories(safeCategories);
        setProducts(safeProducts);
        setLanguages(availableLanguages);
        setLanguage(initialLanguage);
        setTable(nextTable);
        setLastOrderId(nextTable ? readLastOrderId(slug, nextTable.token) : "");

        // Sepet tüm restoranlar için tek bir tarayıcı kaydında tutulur. Bu
        // menüde olmayan (başka restorana ait ya da satıştan kalkmış) ürünler
        // çıkarılır; aksi hâlde sipariş veritabanında reddedilir.
        if (!menuOnly && safeProducts.length > 0) {
          // Kampanya başladıysa ya da bittiyse sepetteki fiyat da güncellenir.
          cartRef.current.syncPrices(new Map(safeProducts.map((product) => [product.id, Number(product.price)])));

          const valid = new Set(safeProducts.map((product) => product.id));
          const stale = cartRef.current.items.filter((item) => !valid.has(item.id));

          if (stale.length > 0) {
            stale.forEach((item) => cartRef.current.removeFromCart(item.id));
            setToast({
              text: menuStrings(initialLanguage).staleCart,
              tone: "error",
            });
          }
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [slug, urlToken, menuOnly, initialData]);

  /* ---------------- Liste ---------------- */

  const query = search.trim().toLocaleLowerCase("tr-TR");

  const shownCategories = useMemo(
    () => categories.map((category) => localize(category, language)),
    [categories, language]
  );

  const shownProducts = useMemo(
    () => products.map((product) => localize(product, language)),
    [products, language]
  );

  const sections = useMemo(() => {
    // Arama hem seçili dilde hem Türkçe adlarda çalışır.
    const original = new Map(products.map((product) => [product.id, product]));

    return shownCategories
      .map((category) => ({
        category,
        items: shownProducts.filter((product) => {
          if (product.category_id !== category.id) return false;
          if (!query) return true;
          const source = original.get(product.id);
          return [
            product.name,
            product.description,
            product.ingredients,
            source?.name,
            source?.description,
          ]
            .join(" ")
            .toLocaleLowerCase("tr-TR")
            .includes(query);
        }),
      }))
      .filter((section) => section.items.length > 0);
  }, [shownCategories, shownProducts, products, query]);

  function chooseLanguage(next: DisplayLanguage) {
    setLanguage(next);
    setSheet(null);
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
    } catch {
      // Tarayıcı depolaması kapalı olabilir.
    }
  }

  const languageOptions: { code: DisplayLanguage; label: string; short: string }[] = [
    { code: "tr", label: "Türkçe", short: "TR" },
    ...MENU_LANGUAGES.filter((item) => languages.includes(item.code)).map((item) => ({
      code: item.code,
      label: item.label,
      short: item.flag,
    })),
  ];
  const currentLanguageShort =
    languageOptions.find((option) => option.code === language)?.short ?? "TR";

  const categoryCounts = useMemo(() => {
    const counts = new Map<number, number>();
    for (const product of products) {
      counts.set(product.category_id, (counts.get(product.category_id) ?? 0) + 1);
    }
    return counts;
  }, [products]);

  // Kampanyalı ürünler: popüler işaretlenenler önce.
  const deals = useMemo(
    () =>
      shownProducts
        .filter((product) => product.promo)
        .sort((a, b) => Number(Boolean(b.promo?.popular)) - Number(Boolean(a.promo?.popular))),
    [shownProducts]
  );

  const quantities = useMemo(
    () => new Map(cart.items.map((item) => [item.id, item.quantity])),
    [cart.items]
  );

  // Kaydırırken ekrandaki kategoriyi işaretle.
  useEffect(() => {
    if (query || sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];

        if (visible) {
          setActiveCategory(Number(visible.target.getAttribute("data-category")));
        }
      },
      { rootMargin: "-25% 0px -65% 0px" }
    );

    sections.forEach(({ category }) => {
      const element = document.getElementById(`kategori-${category.id}`);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, [sections, query]);

  // Seçili kategori şeritte tam görünmüyorsa ortaya kaydır.
  useEffect(() => {
    const bar = chipsRef.current;
    const chip = bar?.querySelector<HTMLElement>(`[data-chip="${activeCategory ?? "all"}"]`);
    if (!bar || !chip) return;

    const left = chip.offsetLeft;
    const right = left + chip.offsetWidth;
    const hidden = left < bar.scrollLeft + 16 || right > bar.scrollLeft + bar.clientWidth - 16;

    if (hidden) {
      bar.scrollTo({
        left: left - (bar.clientWidth - chip.offsetWidth) / 2,
        behavior: smoothBehavior(),
      });
    }
  }, [activeCategory]);

  /* ---------------- Bildirim ve pencereler ---------------- */

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const dialogOpen = Boolean(openProduct || sheet);

  useEffect(() => {
    if (!dialogOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenProduct(null);
        setSheet(null);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [dialogOpen]);

  /* ---------------- İşlemler ---------------- */

  function goToCategory(categoryId: number | null) {
    setSearch("");
    setActiveCategory(categoryId);

    // Arama temizlenince bölümler yeniden çizilir; bir sonraki karede kaydır.
    window.setTimeout(() => {
      if (categoryId === null) {
        window.scrollTo({ top: 0, behavior: smoothBehavior() });
        return;
      }
      document
        .getElementById(`kategori-${categoryId}`)
        ?.scrollIntoView({ behavior: smoothBehavior(), block: "start" });
    }, 0);
  }

  function addProduct(product: Product, quantity = 1) {
    for (let i = 0; i < quantity; i++) {
      cart.addToCart({
        id: product.id,
        name: product.name,
        price: Number(product.price),
        image_url: product.image_url,
        quantity: 1,
      });
    }

    setToast({
      text: t.added(product.name, quantity),
      tone: "ok",
    });
  }

  async function requestService(type: TableRequestType) {
    if (!restaurant || !table || pendingRequest) return;

    setPendingRequest(type);
    const ok = await sendTableRequest(restaurant.id, table.token, type);
    setPendingRequest(null);

    if (ok) {
      setSentRequests((current) => (current.includes(type) ? current : [...current, type]));
      setToast({
        text: type === "garson" ? t.waiterSent : t.billSent,
        tone: "ok",
      });
    } else {
      setToast({
        text: t.requestFailed,
        tone: "error",
      });
    }
  }

  const tableQuery = table ? `?masa=${encodeURIComponent(table.token)}` : "";
  const base = `/restoran/${encodeURIComponent(slug)}`;
  const homeHref = `${base}${tableQuery}`;
  const checkoutHref = `${base}/siparis${tableQuery}`;
  const billHref = `${base}/odeme${tableQuery}`;
  const lastOrderHref =
    table && lastOrderId ? `${base}/siparis/takip/${lastOrderId}${tableQuery}` : "";

  function goToCheckout() {
    if (cart.items.length === 0) return;
    setSheet(null);
    router.push(checkoutHref);
  }

  /* ---------------- Yükleniyor / hata ---------------- */

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.state} role="status">
          <span className={styles.spinner} aria-hidden="true" />
          <strong>{t.preparing}</strong>
          <span>{t.preparingSub}</span>
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className={styles.page}>
        <div className={styles.state} role="alert">
          <strong>{t.cantOpen}</strong>
          <span>{loadError || t.notFound}</span>
        </div>
      </div>
    );
  }

  const initial = restaurant.name.trim().charAt(0).toLocaleUpperCase("tr-TR");

  const serviceProps = {
    t,
    table,
    pendingRequest,
    sentRequests,
    onRequest: requestService,
  };

  const hasLanguages = languages.length > 0;
  const feedbackHref = `${base}/degerlendir`;

  /* ---------------- Ekran ---------------- */

  return (
    <div className={styles.page} lang={language} dir={isRtl(language) ? "rtl" : "ltr"}>
      <div className={`${styles.layout} ${menuOnly ? styles.layoutMenuOnly : ""}`}>
        {/* ===== Masaüstü: sol sütun ===== */}
        <aside className={styles.side}>
          {!menuOnly && (
            <a className={styles.sideBack} href={homeHref}>
              <AuroraIcon name="back" size={16} />
              {t.home}
            </a>
          )}

          <div className={styles.sideBrand}>
            <span className={styles.sideLogo}>
              {restaurant.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={restaurant.logo_url} alt="" />
              ) : (
                initial
              )}
            </span>
            <strong>{restaurant.name}</strong>
            {table && (
              <span className={styles.tableChip}>
                {t.table} {table.number}
              </span>
            )}
          </div>

          {hasLanguages && (
            <div className={styles.langRow} role="group" aria-label={t.language}>
              {languageOptions.map((option) => (
                <button
                  type="button"
                  key={option.code}
                  lang={option.code}
                  className={`${styles.langPill} ${language === option.code ? styles.langPillOn : ""}`}
                  aria-pressed={language === option.code}
                  onClick={() => chooseLanguage(option.code)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}

          <nav className={styles.sideNav} aria-label={t.categories}>
            <button
              type="button"
              className={`${styles.sideNavItem} ${activeCategory === null && !query ? styles.sideNavOn : ""}`}
              onClick={() => goToCategory(null)}
            >
              {t.all} <small>{products.length}</small>
            </button>
            {shownCategories.map((category) =>
              categoryCounts.get(category.id) ? (
                <button
                  type="button"
                  key={category.id}
                  className={`${styles.sideNavItem} ${activeCategory === category.id && !query ? styles.sideNavOn : ""}`}
                  onClick={() => goToCategory(category.id)}
                >
                  {category.name} <small>{categoryCounts.get(category.id)}</small>
                </button>
              ) : null
            )}
          </nav>

          {!menuOnly && (
            <div className={styles.sideHelp}>
              <span className={styles.kicker}>{t.tableService}</span>
              <SideServiceButtons {...serviceProps} />
              {lastOrderHref && (
                <a className={styles.sideButton} href={lastOrderHref}>
                  <AuroraIcon name="clock" size={16} />
                  {t.myOrder}
                </a>
              )}
              <a className={styles.sideButton} href={billHref}>
                <AuroraIcon name="card" size={16} />
                {t.pay}
              </a>
            </div>
          )}

          {menuOnly && (
            <div className={styles.sideHelp}>
              <a className={styles.sideButton} href={feedbackHref}>
                <AuroraIcon name="star" size={16} />
                {t.rateUs}
              </a>
            </div>
          )}
        </aside>

        {/* ===== Menü ===== */}
        <main className={styles.main}>
          <header className={styles.top}>
            {menuOnly ? (
              <span className={`${styles.round} ${styles.topLogo}`} aria-hidden="true">
                {restaurant.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={restaurant.logo_url} alt="" />
                ) : (
                  initial
                )}
              </span>
            ) : (
              <a className={styles.round} href={homeHref} aria-label={t.backHome}>
                <AuroraIcon name="back" />
              </a>
            )}
            <div className={styles.brand}>
              <strong>{restaurant.name}</strong>
              <small>{table ? `${t.table} ${table.number} · ${t.menu}` : t.menu}</small>
            </div>
            {hasLanguages && (
              <button
                type="button"
                className={`${styles.round} ${styles.langButton}`}
                onClick={() => setSheet("language")}
                aria-label={`${t.language}: ${currentLanguageShort}`}
              >
                {currentLanguageShort}
              </button>
            )}
            {!menuOnly && (
              <button
                type="button"
                className={`${styles.round} ${styles.roundAccent}`}
                onClick={() => setSheet("service")}
                aria-label={t.serviceAria}
              >
                <AuroraIcon name="bell" />
              </button>
            )}
          </header>

          <div className={styles.headRow}>
            <h1 className={styles.title}>{t.menu}</h1>
            <label className={styles.search}>
              <AuroraIcon name="search" />
              <input
                id="aurora-menu-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t.search}
                aria-label={t.search}
                autoComplete="off"
              />
              {search && (
                <button
                  type="button"
                  className={styles.searchClear}
                  onClick={() => setSearch("")}
                  aria-label={t.clearSearch}
                >
                  <AuroraIcon name="close" size={16} />
                </button>
              )}
            </label>
          </div>

          {restaurant.is_open === false &&
            (menuOnly ? (
              <div className={`${styles.notice} ${styles.noticeWarn}`} role="status">
                <AuroraIcon name="clock" />
                <span>
                  <strong>{t.closedTitle}</strong>
                  {t.closedSub}
                </span>
              </div>
            ) : (
              <div className={`${styles.notice} ${styles.noticeWarn}`} role="status">
                <AuroraIcon name="clock" />
                <span>
                  <strong>{t.noOrdersTitle}</strong>
                  {t.noOrdersSub}
                </span>
              </div>
            ))}

          {!table && !menuOnly && (
            <div className={styles.notice}>
              <AuroraIcon name="qr" />
              <span>
                <strong>{t.scanTitle}</strong>
                {t.scanSub}
              </span>
            </div>
          )}

          <div className={styles.chips} ref={chipsRef} role="navigation" aria-label={t.categories}>
            <button
              type="button"
              data-chip="all"
              className={`${styles.chip} ${activeCategory === null && !query ? styles.chipOn : ""}`}
              onClick={() => goToCategory(null)}
            >
              {t.all}
            </button>
            {shownCategories.map((category) =>
              categoryCounts.get(category.id) ? (
                <button
                  type="button"
                  key={category.id}
                  data-chip={category.id}
                  className={`${styles.chip} ${activeCategory === category.id && !query ? styles.chipOn : ""}`}
                  onClick={() => goToCategory(category.id)}
                >
                  {category.name}
                  <small>{categoryCounts.get(category.id)}</small>
                </button>
              ) : null
            )}
          </div>

          {query && (
            <p className={styles.resultLine} role="status">
              {t.resultsFor(search.trim(), sections.reduce((sum, s) => sum + s.items.length, 0))}
            </p>
          )}

          {!query && deals.length > 0 && (
            <section className={styles.deals} aria-labelledby="kampanyalar-baslik">
              <h2 id="kampanyalar-baslik" className={styles.sectionTitle}>
                {t.deals}
                <small>{t.items(deals.length)}</small>
              </h2>
              <div className={styles.dealRail}>
                {deals.map((product) => (
                  <button
                    type="button"
                    key={product.id}
                    className={`${styles.deal} ${product.image_url ? "" : styles.dealNoImage}`}
                    onClick={() => {
                      setOpenProduct(product);
                      trackProductView(restaurant.id, product.id, language);
                    }}
                  >
                    {product.image_url && (
                      <span className={styles.dealImage}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={product.image_url} alt="" loading="lazy" />
                      </span>
                    )}
                    <span className={styles.promoBadge}>{product.promo?.label}</span>
                    <strong>{product.name}</strong>
                    <span className={styles.dealPrice}>
                      <PriceLine product={product} />
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {sections.map(({ category, items }) => (
            <section
              key={category.id}
              id={`kategori-${category.id}`}
              data-category={category.id}
              className={styles.section}
              aria-labelledby={`kategori-baslik-${category.id}`}
            >
              <h2 id={`kategori-baslik-${category.id}`} className={styles.sectionTitle}>
                {category.name}
                <small>{t.items(items.length)}</small>
              </h2>

              <div className={styles.grid}>
                {items.map((product) => (
                  <ProductRow
                    key={product.id}
                    t={t}
                    product={product}
                    quantity={quantities.get(product.id) ?? 0}
                    onOpen={() => {
                      setOpenProduct(product);
                      trackProductView(restaurant.id, product.id, language);
                    }}
                    onAdd={menuOnly ? undefined : () => addProduct(product)}
                  />
                ))}
              </div>
            </section>
          ))}

          {sections.length === 0 && (
            <div className={styles.empty}>
              <strong>{query ? t.noResults : t.emptyMenu}</strong>
              <span>{query ? t.noResultsSub : t.emptyMenuSub}</span>
              {query && (
                <button type="button" className={styles.textButton} onClick={() => setSearch("")}>
                  {t.showAll}
                </button>
              )}
            </div>
          )}

          {menuOnly && sections.length > 0 && !query && (
            <a className={`${styles.notice} ${styles.rateLink}`} href={feedbackHref}>
              <AuroraIcon name="star" />
              <span>
                <strong>{t.rateUs}</strong>
              </span>
              <AuroraIcon name="arrow" size={16} />
            </a>
          )}

          {sections.length > 0 && !query && (
            <p className={`${styles.legalLine} ${styles.menuLegal}`}>
              <a href="/kvkk#menu-kullanicilari" target="_blank" rel="noreferrer">
                {t.privacy}
              </a>
            </p>
          )}
        </main>

        {/* ===== Masaüstü: sepet ===== */}
        {!menuOnly && (
          <aside className={styles.cartPanel} aria-label={t.cart}>
            <CartContents
              t={t}
              cart={cart}
              table={table}
              onCheckout={goToCheckout}
              headingId="sepet-panel-baslik"
            />
          </aside>
        )}
      </div>

      {/* ===== Mobil: sepet çubuğu ===== */}
      {!menuOnly && cart.itemCount > 0 && (
        <button type="button" className={styles.cartBar} onClick={() => setSheet("cart")}>
          <span className={styles.cartCount}>{cart.itemCount}</span>
          <span className={styles.cartBarText}>
            <strong>{formatLira(cart.total)}</strong>
            <small>
              {table
                ? `${t.items(cart.itemCount)} · ${t.table} ${table.number}`
                : t.items(cart.itemCount)}
            </small>
          </span>
          <span className={styles.cartBarGo}>
            {t.viewCart}
            <AuroraIcon name="arrow" />
          </span>
        </button>
      )}

      {/* ===== Bildirim ===== */}
      <div className={styles.toastRegion} aria-live="polite">
        {toast && (
          <div className={`${styles.toast} ${toast.tone === "error" ? styles.toastError : ""}`}>
            <span className={styles.toastIcon}>
              <AuroraIcon name={toast.tone === "error" ? "alert" : "check"} size={13} strokeWidth={2.4} />
            </span>
            {toast.text}
          </div>
        )}
      </div>

      {/* ===== Ürün ===== */}
      {openProduct && (
        <ProductDialog
          key={openProduct.id}
          t={t}
          product={localize(openProduct, language)}
          inCart={quantities.get(openProduct.id) ?? 0}
          onClose={() => setOpenProduct(null)}
          onAdd={
            menuOnly
              ? undefined
              : (quantity) => {
                  addProduct(localize(openProduct, language), quantity);
                  setOpenProduct(null);
                }
          }
        />
      )}

      {/* ===== Sepet ===== */}
      {sheet === "cart" && (
        <Sheet labelledBy="sepet-baslik" onClose={() => setSheet(null)} closeLabel={t.close}>
          <span className={styles.handle} aria-hidden="true" />
          <CartContents
            t={t}
            cart={cart}
            table={table}
            onCheckout={goToCheckout}
            onClose={() => setSheet(null)}
            headingId="sepet-baslik"
          />
        </Sheet>
      )}

      {/* ===== Hizmet ===== */}
      {sheet === "service" && (
        <Sheet labelledBy="hizmet-baslik" onClose={() => setSheet(null)} closeLabel={t.close}>
          <span className={styles.handle} aria-hidden="true" />
          <div className={styles.sheetHead}>
            <div>
              <h2 id="hizmet-baslik">{t.helpTitle}</h2>
              <small>{table ? `${t.table} ${table.number}` : t.noTableLink}</small>
            </div>
            <button type="button" className={styles.round} onClick={() => setSheet(null)} aria-label={t.close}>
              <AuroraIcon name="close" />
            </button>
          </div>

          {table ? (
            <div className={styles.serviceList}>
              <ServiceItem
                t={t}
                icon="bell"
                title={t.callWaiter}
                subtitle={t.callWaiterSub}
                doneTitle={t.waiterCalled}
                done={sentRequests.includes("garson")}
                pending={pendingRequest === "garson"}
                onClick={() => requestService("garson")}
              />
              <ServiceItem
                t={t}
                icon="receipt"
                title={t.askBill}
                subtitle={t.askBillSub}
                doneTitle={t.billAsked}
                done={sentRequests.includes("hesap")}
                pending={pendingRequest === "hesap"}
                onClick={() => requestService("hesap")}
              />
              {lastOrderHref && (
                <ServiceLink icon="clock" title={t.myOrder} subtitle={t.myOrderSub} href={lastOrderHref} />
              )}
              <ServiceLink icon="card" title={t.pay} subtitle={t.paySub} href={billHref} />
            </div>
          ) : (
            <div className={styles.noTable}>
              <AuroraIcon name="qr" size={22} />
              <strong>{t.scanTable}</strong>
              <span>{t.scanTableSub}</span>
            </div>
          )}
        </Sheet>
      )}

      {/* ===== Dil ===== */}
      {sheet === "language" && (
        <Sheet labelledBy="dil-baslik" onClose={() => setSheet(null)} closeLabel={t.close}>
          <span className={styles.handle} aria-hidden="true" />
          <div className={styles.sheetHead}>
            <div>
              <h2 id="dil-baslik">{t.language}</h2>
            </div>
            <button type="button" className={styles.round} onClick={() => setSheet(null)} aria-label={t.close}>
              <AuroraIcon name="close" />
            </button>
          </div>

          <div className={styles.serviceList}>
            {languageOptions.map((option) => (
              <button
                type="button"
                key={option.code}
                lang={option.code}
                className={`${styles.serviceItem} ${language === option.code ? styles.serviceDone : ""}`}
                aria-pressed={language === option.code}
                onClick={() => chooseLanguage(option.code)}
              >
                <span className={styles.serviceTile}>
                  {language === option.code ? <AuroraIcon name="check" /> : option.short}
                </span>
                <span className={styles.serviceText}>
                  <strong>{option.label}</strong>
                </span>
              </button>
            ))}
          </div>
        </Sheet>
      )}
    </div>
  );
}

/* =========================================================
   FİYAT (kampanyada eski fiyat üstü çizili)
   ========================================================= */

function PriceLine({ product }: { product: Product }) {
  return (
    <>
      {product.promo && <del className={styles.oldPrice}>{formatLira(product.promo.oldPrice)}</del>}
      {formatLira(Number(product.price))}
    </>
  );
}

/* =========================================================
   ÜRÜN SATIRI
   ========================================================= */

function ProductRow({
  t,
  product,
  quantity,
  onOpen,
  onAdd,
}: {
  t: MenuStrings;
  product: Product;
  quantity: number;
  onOpen: () => void;
  // Yoksa (sadece menü) sepete ekleme düğmesi gösterilmez.
  onAdd?: () => void;
}) {
  return (
    <article
      className={`${styles.product} ${product.image_url ? "" : styles.productNoImage} ${onAdd ? "" : styles.productReadOnly}`}
    >
      <button type="button" className={styles.productMain} onClick={onOpen}>
        <span className={styles.productText}>
          {product.promo && <span className={styles.promoBadge}>{product.promo.label}</span>}
          <strong>{product.name}</strong>
          {product.description?.trim() && (
            <span className={styles.productDesc}>{product.description}</span>
          )}
          <span className={styles.productPrice}>
            <PriceLine product={product} />
            {product.calories != null && (
              <small className={styles.kcal}>{product.calories.toLocaleString(t.locale)} kcal</small>
            )}
          </span>
        </span>
        {product.image_url && (
          <span className={styles.productImage}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={product.image_url} alt="" loading="lazy" />
          </span>
        )}
      </button>

      {onAdd && (
        <button
          type="button"
          className={`${styles.add} ${quantity > 0 ? styles.addHas : ""}`}
          onClick={onAdd}
          aria-label={quantity > 0 ? t.inCartMore(product.name, quantity) : t.addToCartAria(product.name)}
        >
          <AuroraIcon name="plus" size={quantity > 0 ? 13 : 17} strokeWidth={2.4} />
          {quantity > 0 && <span>{quantity}</span>}
        </button>
      )}
    </article>
  );
}

/* =========================================================
   PENCERE (alttan açılır; masaüstünde ortada)
   ========================================================= */

function Sheet({
  labelledBy,
  onClose,
  closeLabel = "Kapat",
  className,
  children,
}: {
  labelledBy: string;
  onClose: () => void;
  closeLabel?: string;
  className?: string;
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  return (
    <div className={styles.dialogRoot} role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
      <button type="button" className={styles.backdrop} aria-label={closeLabel} tabIndex={-1} onClick={onClose} />
      <div ref={panelRef} tabIndex={-1} className={`${styles.sheet} ${className ?? ""}`}>
        {children}
      </div>
    </div>
  );
}

/* =========================================================
   ÜRÜN PENCERESİ
   ========================================================= */

function ProductDialog({
  t,
  product,
  inCart,
  onClose,
  onAdd,
}: {
  t: MenuStrings;
  product: Product;
  inCart: number;
  onClose: () => void;
  // Yoksa (sadece menü) adet seçimi ve "Sepete ekle" gösterilmez.
  onAdd?: (quantity: number) => void;
}) {
  const [quantity, setQuantity] = useState(1);
  const ingredients = splitList(product.ingredients);
  const allergens = splitList(product.allergens);
  const price = Number(product.price);

  return (
    <Sheet
      labelledBy="urun-baslik"
      onClose={onClose}
      closeLabel={t.close}
      className={product.image_url ? "" : styles.productNoHero}
    >
      {product.image_url ? (
        <div className={styles.productHero}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={product.image_url} alt={product.name} />
        </div>
      ) : (
        <span className={styles.handle} aria-hidden="true" />
      )}

      <button
        type="button"
        className={`${styles.round} ${styles.sheetClose} ${product.image_url ? styles.closeOnImage : ""}`}
        onClick={onClose}
        aria-label={t.close}
      >
        <AuroraIcon name="close" />
      </button>

      <div className={styles.sheetScroll}>
        <div className={styles.productBody}>
          <div className={styles.productHead}>
            <h2 id="urun-baslik">{product.name}</h2>
            <span>
              {product.promo && <del className={styles.oldPrice}>{formatLira(product.promo.oldPrice)}</del>}
              {formatLira(price)}
            </span>
          </div>

          {product.promo && (
            <div className={styles.promoNote}>
              <span className={styles.promoBadge}>{product.promo.label}</span>
              <span>
                <strong>{product.promo.title}</strong>
                {product.promo.description && <small>{product.promo.description}</small>}
                {product.promo.endsAt && (
                  <small>
                    {t.dealUntil(
                      new Date(product.promo.endsAt).toLocaleString(t.locale, {
                        timeZone: "Europe/Istanbul",
                        day: "numeric",
                        month: "long",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    )}
                  </small>
                )}
              </span>
            </div>
          )}

          {product.description?.trim() && <p>{product.description}</p>}

          {product.calories != null && (
            <p className={styles.kcalLine}>{t.approxCalories(product.calories.toLocaleString(t.locale))}</p>
          )}

          {ingredients.length > 0 && (
            <div>
              <span className={styles.kicker}>{t.ingredients}</span>
              <ul className={styles.tags}>
                {ingredients.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {allergens.length > 0 && (
            <div>
              <span className={styles.kicker}>{t.allergens}</span>
              <ul className={`${styles.tags} ${styles.tagsWarn}`}>
                {allergens.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {onAdd && inCart > 0 && <p className={styles.inCart}>{t.inCart(inCart)}</p>}
        </div>
      </div>

      {onAdd && (
        <div className={styles.productFoot}>
          <div className={`${styles.stepper} ${styles.stepperLg}`}>
            <button
              type="button"
              onClick={() => setQuantity((value) => Math.max(1, value - 1))}
              disabled={quantity <= 1}
              aria-label={t.decrease}
            >
              <AuroraIcon name="minus" strokeWidth={2.2} />
            </button>
            <b aria-live="polite">{quantity}</b>
            <button
              type="button"
              onClick={() => setQuantity((value) => Math.min(99, value + 1))}
              aria-label={t.increase}
            >
              <AuroraIcon name="plus" strokeWidth={2.2} />
            </button>
          </div>

          <button type="button" className={styles.cta} onClick={() => onAdd?.(quantity)}>
            <span>{t.addToCart}</span>
            <span className={styles.ctaPrice}>{formatLira(price * quantity)}</span>
          </button>
        </div>
      )}
    </Sheet>
  );
}

/* =========================================================
   SEPET (mobil pencere + masaüstü panel)
   ========================================================= */

function CartContents({
  t,
  cart,
  table,
  onCheckout,
  onClose,
  headingId,
}: {
  t: MenuStrings;
  cart: CartApi;
  table: Table | null;
  onCheckout: () => void;
  onClose?: () => void;
  headingId: string;
}) {
  const { items, total, itemCount, increaseQuantity, decreaseQuantity } = cart;

  return (
    <div className={styles.cartBox}>
      <div className={styles.sheetHead}>
        <div>
          <h2 id={headingId}>{t.myCart}</h2>
          <small>{itemCount > 0 ? t.items(itemCount) : t.noItems}</small>
        </div>
        {table && (
          <span className={styles.tableChip}>
            {t.table} {table.number}
          </span>
        )}
        {onClose && !table && (
          <button type="button" className={styles.round} onClick={onClose} aria-label={t.close}>
            <AuroraIcon name="close" />
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className={styles.cartEmpty}>
          <span className={styles.emptyIcon}>
            <AuroraIcon name="bag" size={22} />
          </span>
          <strong>{t.cartEmpty}</strong>
          <span>{t.cartEmptySub}</span>
        </div>
      ) : (
        <>
          <ul className={styles.cartList}>
            {items.map((item) => (
              <li key={item.id} className={styles.cartItem}>
                <span className={styles.cartThumb}>
                  {item.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.image_url} alt="" />
                  ) : (
                    <AuroraIcon name="plate" size={22} />
                  )}
                </span>
                <span className={styles.cartInfo}>
                  <strong>{item.name}</strong>
                  <span className={styles.cartLine}>
                    <span className={styles.stepper}>
                      <button
                        type="button"
                        onClick={() => decreaseQuantity(item.id)}
                        aria-label={item.quantity === 1 ? t.removeItem(item.name) : t.decreaseItem(item.name)}
                      >
                        <AuroraIcon name={item.quantity === 1 ? "trash" : "minus"} size={15} strokeWidth={2} />
                      </button>
                      <b>{item.quantity}</b>
                      <button
                        type="button"
                        onClick={() => increaseQuantity(item.id)}
                        aria-label={t.increaseItem(item.name)}
                      >
                        <AuroraIcon name="plus" size={15} strokeWidth={2} />
                      </button>
                    </span>
                    <span className={styles.cartPrice}>
                      {formatLira(Number(item.price) * item.quantity)}
                      {item.quantity > 1 && (
                        <small>
                          {item.quantity} × {formatLira(Number(item.price))}
                        </small>
                      )}
                    </span>
                  </span>
                </span>
              </li>
            ))}
          </ul>

          <div className={styles.cartTotal}>
            <span>{t.total}</span>
            <strong>{formatLira(total)}</strong>
          </div>

          {!table && (
            <p className={styles.cartNote}>
              <AuroraIcon name="qr" size={16} />
              {t.cartNeedsTable}
            </p>
          )}
        </>
      )}

      <div className={styles.cartActions}>
        {items.length > 0 && (
          <button type="button" className={styles.cta} onClick={onCheckout}>
            <span>{t.checkout}</span>
            <AuroraIcon name="arrow" />
          </button>
        )}
        {onClose && (
          <button type="button" className={styles.ghost} onClick={onClose}>
            {t.backToMenu}
          </button>
        )}
      </div>
    </div>
  );
}

/* =========================================================
   HİZMET DÜĞMELERİ
   ========================================================= */

function ServiceItem({
  t,
  icon,
  title,
  subtitle,
  doneTitle,
  done,
  pending,
  onClick,
}: {
  t: MenuStrings;
  icon: AuroraIconName;
  title: string;
  subtitle: string;
  doneTitle: string;
  done: boolean;
  pending: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`${styles.serviceItem} ${done ? styles.serviceDone : ""}`}
      onClick={onClick}
      disabled={pending}
    >
      <span className={styles.serviceTile}>
        <AuroraIcon name={done ? "check" : icon} />
      </span>
      <span className={styles.serviceText}>
        <strong>{pending ? t.sending : done ? doneTitle : title}</strong>
        <small>{done ? t.requestDone : subtitle}</small>
      </span>
    </button>
  );
}

function ServiceLink({
  icon,
  title,
  subtitle,
  href,
}: {
  icon: AuroraIconName;
  title: string;
  subtitle: string;
  href: string;
}) {
  return (
    <a className={styles.serviceItem} href={href}>
      <span className={styles.serviceTile}>
        <AuroraIcon name={icon} />
      </span>
      <span className={styles.serviceText}>
        <strong>{title}</strong>
        <small>{subtitle}</small>
      </span>
      <span className={styles.serviceArrow}>
        <AuroraIcon name="arrow" size={16} />
      </span>
    </a>
  );
}

function SideServiceButtons({
  t,
  table,
  pendingRequest,
  sentRequests,
  onRequest,
}: {
  t: MenuStrings;
  table: Table | null;
  pendingRequest: TableRequestType | null;
  sentRequests: TableRequestType[];
  onRequest: (type: TableRequestType) => void;
}) {
  if (!table) {
    return <p className={styles.sideHint}>{t.scanForWaiter}</p>;
  }

  const buttons: { type: TableRequestType; icon: AuroraIconName; title: string; done: string }[] = [
    { type: "garson", icon: "bell", title: t.callWaiter, done: t.waiterCalled },
    { type: "hesap", icon: "receipt", title: t.askBill, done: t.billAsked },
  ];

  return (
    <>
      {buttons.map((button) => {
        const done = sentRequests.includes(button.type);
        return (
          <button
            key={button.type}
            type="button"
            className={`${styles.sideButton} ${done ? styles.sideButtonDone : ""}`}
            onClick={() => onRequest(button.type)}
            disabled={pendingRequest === button.type}
          >
            <AuroraIcon name={done ? "check" : button.icon} size={16} />
            {pendingRequest === button.type ? t.sending : done ? button.done : button.title}
          </button>
        );
      })}
    </>
  );
}
