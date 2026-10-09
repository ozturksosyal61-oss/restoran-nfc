"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "../../../../lib/supabase/client";
import {
  readLastOrderId,
  readSavedTableToken,
  sendTableRequest,
  type TableRequestType,
} from "../aurora-utils";
import {
  MENU_LANGUAGES,
  localize,
  menuStrings,
  normalizeLanguages,
  type DisplayLanguage,
  type MenuLanguage,
} from "../../../../lib/menu-i18n";
import { trackMenuView, trackProductView } from "../../../../lib/menu-tracking";
import { hasPlanFeature } from "../../../../lib/plan";
import type { MenuData } from "../../../../lib/menu-data";
import { applyPromotions, readMenuPromotions, type ProductPromo } from "../../../../lib/menu-promotions";
import { useCart } from "./CartContext";

// Müşteri menüsünün tasarımdan bağımsız mantığı: veri, masa kodu, dil,
// arama, kampanyalar, sepet ve garson / hesap çağrısı. Her menü tasarımı
// (Aurora, Zest, Linen, Luna) bu kancayı kullanır ve yalnızca görünümü çizer;
// yeni bir menü özelliği burada bir kez yazılır.

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

export type MenuCategory = {
  id: number;
  name: string;
  translations?: unknown;
};

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
  // Aktif kampanya varsa price indirimli fiyattır.
  promo?: ProductPromo | null;
};

export type MenuRestaurant = {
  id: number;
  name: string;
  logo_url: string | null;
  is_open: boolean | null;
};

export type MenuTable = { token: string; number: number };

export type MenuToast = { text: string; tone: "ok" | "error" };

export type CartApi = ReturnType<typeof useCart>;

export function smoothBehavior(): ScrollBehavior {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? "auto"
    : "smooth";
}

type Category = MenuCategory;
type Product = MenuProduct;
type Restaurant = MenuRestaurant;
type Table = MenuTable;
type Toast = MenuToast;

// menuOnly: "sadece menü" restoranı. Sepet, sipariş, garson çağırma, ödeme
// ve masa kodu yoktur; müşteri yalnızca ürünleri ve fiyatları görür.
export function useMenuController({
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

  // Ürün detayını açar ve menü istatistiğine "görüntülendi" yazar.
  function viewProduct(product: Product) {
    setOpenProduct(product);
    if (restaurant) trackProductView(restaurant.id, product.id, language);
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

  return {
    cart,
    restaurant,
    products,
    table,
    loading,
    loadError,
    search,
    setSearch,
    activeCategory,
    setActiveCategory,
    openProduct,
    setOpenProduct,
    viewProduct,
    sheet,
    setSheet,
    languages,
    language,
    t,
    toast,
    setToast,
    pendingRequest,
    sentRequests,
    chipsRef,
    query,
    shownCategories,
    shownProducts,
    sections,
    chooseLanguage,
    languageOptions,
    currentLanguageShort,
    categoryCounts,
    deals,
    quantities,
    dialogOpen,
    goToCategory,
    addProduct,
    requestService,
    tableQuery,
    base,
    homeHref,
    checkoutHref,
    billHref,
    lastOrderHref,
    goToCheckout,
  };
}

export type MenuController = ReturnType<typeof useMenuController>;
