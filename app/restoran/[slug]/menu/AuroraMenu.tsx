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
import { useCart } from "./CartContext";
import styles from "./AuroraMenu.module.css";

// Renkler ve yazı tipleri restoran kabuğundan (layout.tsx) gelir;
// her Aurora renk teması aynı menüyü kullanır.

type Category = {
  id: number;
  name: string;
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
}: {
  slug: string;
  menuOnly?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlToken = searchParams.get("masa")?.trim() || "";
  const cart = useCart();

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [table, setTable] = useState<Table | null>(null);
  const [lastOrderId, setLastOrderId] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [openProduct, setOpenProduct] = useState<Product | null>(null);
  const [sheet, setSheet] = useState<"cart" | "service" | null>(null);
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

        const { data: restaurantData } = await supabase
          .from("restaurants")
          .select("id, name, logo_url, is_open")
          .eq("slug", slug)
          .eq("is_active", true)
          .maybeSingle();

        if (!restaurantData) {
          if (!cancelled) setLoadError("İşletme bulunamadı.");
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
        }

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

        setRestaurant(restaurantData as Restaurant);
        setCategories(safeCategories);
        setProducts(safeProducts);
        setTable(nextTable);
        setLastOrderId(nextTable ? readLastOrderId(slug, nextTable.token) : "");

        // Sepet tüm restoranlar için tek bir tarayıcı kaydında tutulur. Bu
        // menüde olmayan (başka restorana ait ya da satıştan kalkmış) ürünler
        // çıkarılır; aksi hâlde sipariş veritabanında reddedilir.
        if (!menuOnly && safeProducts.length > 0) {
          const valid = new Set(safeProducts.map((product) => product.id));
          const stale = cartRef.current.items.filter((item) => !valid.has(item.id));

          if (stale.length > 0) {
            stale.forEach((item) => cartRef.current.removeFromCart(item.id));
            setToast({
              text: "Sepetinizde bu menüde olmayan ürünler vardı, çıkarıldı.",
              tone: "error",
            });
          }
        }
      } catch (error) {
        console.error("Aurora menü yüklenemedi:", error);
        if (!cancelled) setLoadError("Menü yüklenirken bir sorun oluştu. Sayfayı yenileyin.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [slug, urlToken, menuOnly]);

  /* ---------------- Liste ---------------- */

  const query = search.trim().toLocaleLowerCase("tr-TR");

  const sections = useMemo(
    () =>
      categories
        .map((category) => ({
          category,
          items: products.filter(
            (product) =>
              product.category_id === category.id &&
              (!query ||
                [product.name, product.description, product.ingredients]
                  .join(" ")
                  .toLocaleLowerCase("tr-TR")
                  .includes(query))
          ),
        }))
        .filter((section) => section.items.length > 0),
    [categories, products, query]
  );

  const categoryCounts = useMemo(() => {
    const counts = new Map<number, number>();
    for (const product of products) {
      counts.set(product.category_id, (counts.get(product.category_id) ?? 0) + 1);
    }
    return counts;
  }, [products]);

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
      text:
        quantity > 1
          ? `${product.name} · ${quantity} adet sepete eklendi`
          : `${product.name} sepete eklendi`,
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
        text: type === "garson" ? "Garson çağrınız iletildi" : "Hesap isteğiniz iletildi",
        tone: "ok",
      });
    } else {
      setToast({
        text: "Talep gönderilemedi. Tekrar deneyin ya da bir görevliye seslenin.",
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
          <strong>Menü hazırlanıyor</strong>
          <span>Birkaç saniye sürebilir.</span>
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className={styles.page}>
        <div className={styles.state} role="alert">
          <strong>Menü açılamadı</strong>
          <span>{loadError || "İşletme bulunamadı."}</span>
        </div>
      </div>
    );
  }

  const initial = restaurant.name.trim().charAt(0).toLocaleUpperCase("tr-TR");

  const serviceProps = {
    table,
    pendingRequest,
    sentRequests,
    onRequest: requestService,
  };

  /* ---------------- Ekran ---------------- */

  return (
    <div className={styles.page}>
      <div className={`${styles.layout} ${menuOnly ? styles.layoutMenuOnly : ""}`}>
        {/* ===== Masaüstü: sol sütun ===== */}
        <aside className={styles.side}>
          {!menuOnly && (
            <a className={styles.sideBack} href={homeHref}>
              <AuroraIcon name="back" size={16} />
              Ana sayfa
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
            {table && <span className={styles.tableChip}>Masa {table.number}</span>}
          </div>

          <nav className={styles.sideNav} aria-label="Kategoriler">
            <button
              type="button"
              className={`${styles.sideNavItem} ${activeCategory === null && !query ? styles.sideNavOn : ""}`}
              onClick={() => goToCategory(null)}
            >
              Tümü <small>{products.length}</small>
            </button>
            {categories.map((category) =>
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
              <span className={styles.kicker}>Masaya hizmet</span>
              <SideServiceButtons {...serviceProps} />
              {lastOrderHref && (
                <a className={styles.sideButton} href={lastOrderHref}>
                  <AuroraIcon name="clock" size={16} />
                  Siparişim
                </a>
              )}
              <a className={styles.sideButton} href={billHref}>
                <AuroraIcon name="card" size={16} />
                Ödeme yap
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
              <a className={styles.round} href={homeHref} aria-label="Ana sayfaya dön">
                <AuroraIcon name="back" />
              </a>
            )}
            <div className={styles.brand}>
              <strong>{restaurant.name}</strong>
              <small>{table ? `Masa ${table.number} · Menü` : "Menü"}</small>
            </div>
            {!menuOnly && (
              <button
                type="button"
                className={`${styles.round} ${styles.roundAccent}`}
                onClick={() => setSheet("service")}
                aria-label="Garson çağır veya hesap iste"
              >
                <AuroraIcon name="bell" />
              </button>
            )}
          </header>

          <div className={styles.headRow}>
            <h1 className={styles.title}>Menü</h1>
            <label className={styles.search}>
              <AuroraIcon name="search" />
              <input
                id="aurora-menu-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Menüde ara"
                aria-label="Menüde ara"
                autoComplete="off"
              />
              {search && (
                <button
                  type="button"
                  className={styles.searchClear}
                  onClick={() => setSearch("")}
                  aria-label="Aramayı temizle"
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
                  <strong>Şu an kapalıyız</strong>
                  Menümüzü inceleyebilirsiniz.
                </span>
              </div>
            ) : (
              <div className={`${styles.notice} ${styles.noticeWarn}`} role="status">
                <AuroraIcon name="clock" />
                <span>
                  <strong>Şu an sipariş alınmıyor</strong>
                  Menüyü inceleyebilirsiniz; siparişler işletme açıldığında alınır.
                </span>
              </div>
            ))}

          {!table && !menuOnly && (
            <div className={styles.notice}>
              <AuroraIcon name="qr" />
              <span>
                <strong>Sipariş için masadaki QR kodu okutun</strong>
                Menüye göz atabilir, sepetinizi hazırlayabilirsiniz.
              </span>
            </div>
          )}

          <div className={styles.chips} ref={chipsRef} role="navigation" aria-label="Kategoriler">
            <button
              type="button"
              data-chip="all"
              className={`${styles.chip} ${activeCategory === null && !query ? styles.chipOn : ""}`}
              onClick={() => goToCategory(null)}
            >
              Tümü
            </button>
            {categories.map((category) =>
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
              “{search.trim()}” için {sections.reduce((sum, s) => sum + s.items.length, 0)} ürün
            </p>
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
                <small>{items.length} ürün</small>
              </h2>

              <div className={styles.grid}>
                {items.map((product) => (
                  <ProductRow
                    key={product.id}
                    product={product}
                    quantity={quantities.get(product.id) ?? 0}
                    onOpen={() => setOpenProduct(product)}
                    onAdd={menuOnly ? undefined : () => addProduct(product)}
                  />
                ))}
              </div>
            </section>
          ))}

          {sections.length === 0 && (
            <div className={styles.empty}>
              <strong>{query ? "Aramanızla eşleşen ürün yok" : "Menü henüz hazır değil"}</strong>
              <span>
                {query
                  ? "Farklı bir kelime deneyin ya da tüm menüye dönün."
                  : "İşletme menüsünü eklediğinde ürünler burada görünecek."}
              </span>
              {query && (
                <button type="button" className={styles.textButton} onClick={() => setSearch("")}>
                  Tüm menüyü göster
                </button>
              )}
            </div>
          )}
        </main>

        {/* ===== Masaüstü: sepet ===== */}
        {!menuOnly && (
          <aside className={styles.cartPanel} aria-label="Sepet">
            <CartContents
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
            <small>{table ? `${cart.itemCount} ürün · Masa ${table.number}` : `${cart.itemCount} ürün`}</small>
          </span>
          <span className={styles.cartBarGo}>
            Sepeti gör
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
          product={openProduct}
          inCart={quantities.get(openProduct.id) ?? 0}
          onClose={() => setOpenProduct(null)}
          onAdd={
            menuOnly
              ? undefined
              : (quantity) => {
                  addProduct(openProduct, quantity);
                  setOpenProduct(null);
                }
          }
        />
      )}

      {/* ===== Sepet ===== */}
      {sheet === "cart" && (
        <Sheet labelledBy="sepet-baslik" onClose={() => setSheet(null)}>
          <span className={styles.handle} aria-hidden="true" />
          <CartContents
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
        <Sheet labelledBy="hizmet-baslik" onClose={() => setSheet(null)}>
          <span className={styles.handle} aria-hidden="true" />
          <div className={styles.sheetHead}>
            <div>
              <h2 id="hizmet-baslik">Size nasıl yardımcı olalım?</h2>
              <small>{table ? `Masa ${table.number}` : "Masa bağlantısı yok"}</small>
            </div>
            <button type="button" className={styles.round} onClick={() => setSheet(null)} aria-label="Kapat">
              <AuroraIcon name="close" />
            </button>
          </div>

          {table ? (
            <div className={styles.serviceList}>
              <ServiceItem
                icon="bell"
                title="Garson çağır"
                subtitle="Masanıza bir görevli gelsin"
                doneTitle="Garson çağrıldı"
                done={sentRequests.includes("garson")}
                pending={pendingRequest === "garson"}
                onClick={() => requestService("garson")}
              />
              <ServiceItem
                icon="receipt"
                title="Hesap iste"
                subtitle="Adisyon masanıza getirilsin"
                doneTitle="Hesap istendi"
                done={sentRequests.includes("hesap")}
                pending={pendingRequest === "hesap"}
                onClick={() => requestService("hesap")}
              />
              {lastOrderHref && (
                <ServiceLink icon="clock" title="Siparişim" subtitle="Son siparişinizin durumu" href={lastOrderHref} />
              )}
              <ServiceLink icon="card" title="Ödeme yap" subtitle="Masa hesabını görüntüleyin" href={billHref} />
            </div>
          ) : (
            <div className={styles.noTable}>
              <AuroraIcon name="qr" size={22} />
              <strong>Masadaki QR kodu okutun</strong>
              <span>
                Garson çağırmak ve hesap istemek için masanızdaki QR kodu okutun ya da NFC
                etiketine telefonunuzu yaklaştırın.
              </span>
            </div>
          )}
        </Sheet>
      )}
    </div>
  );
}

/* =========================================================
   ÜRÜN SATIRI
   ========================================================= */

function ProductRow({
  product,
  quantity,
  onOpen,
  onAdd,
}: {
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
          <strong>{product.name}</strong>
          {product.description?.trim() && (
            <span className={styles.productDesc}>{product.description}</span>
          )}
          <span className={styles.productPrice}>{formatLira(Number(product.price))}</span>
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
          aria-label={
            quantity > 0
              ? `${product.name} sepette ${quantity} adet, bir tane daha ekle`
              : `${product.name} sepete ekle`
          }
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
  className,
  children,
}: {
  labelledBy: string;
  onClose: () => void;
  className?: string;
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  return (
    <div className={styles.dialogRoot} role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
      <button type="button" className={styles.backdrop} aria-label="Kapat" tabIndex={-1} onClick={onClose} />
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
  product,
  inCart,
  onClose,
  onAdd,
}: {
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
        aria-label="Kapat"
      >
        <AuroraIcon name="close" />
      </button>

      <div className={styles.sheetScroll}>
        <div className={styles.productBody}>
          <div className={styles.productHead}>
            <h2 id="urun-baslik">{product.name}</h2>
            <span>{formatLira(price)}</span>
          </div>

          {product.description?.trim() && <p>{product.description}</p>}

          {ingredients.length > 0 && (
            <div>
              <span className={styles.kicker}>İçindekiler</span>
              <ul className={styles.tags}>
                {ingredients.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {allergens.length > 0 && (
            <div>
              <span className={styles.kicker}>Alerjenler</span>
              <ul className={`${styles.tags} ${styles.tagsWarn}`}>
                {allergens.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {onAdd && inCart > 0 && <p className={styles.inCart}>Sepetinizde {inCart} adet var.</p>}
        </div>
      </div>

      {onAdd && (
        <div className={styles.productFoot}>
          <div className={`${styles.stepper} ${styles.stepperLg}`}>
            <button
              type="button"
              onClick={() => setQuantity((value) => Math.max(1, value - 1))}
              disabled={quantity <= 1}
              aria-label="Adedi azalt"
            >
              <AuroraIcon name="minus" strokeWidth={2.2} />
            </button>
            <b aria-live="polite">{quantity}</b>
            <button
              type="button"
              onClick={() => setQuantity((value) => Math.min(99, value + 1))}
              aria-label="Adedi artır"
            >
              <AuroraIcon name="plus" strokeWidth={2.2} />
            </button>
          </div>

          <button type="button" className={styles.cta} onClick={() => onAdd?.(quantity)}>
            <span>Sepete ekle</span>
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
  cart,
  table,
  onCheckout,
  onClose,
  headingId,
}: {
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
          <h2 id={headingId}>Sepetim</h2>
          <small>{itemCount > 0 ? `${itemCount} ürün` : "Henüz ürün yok"}</small>
        </div>
        {table && <span className={styles.tableChip}>Masa {table.number}</span>}
        {onClose && !table && (
          <button type="button" className={styles.round} onClick={onClose} aria-label="Kapat">
            <AuroraIcon name="close" />
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className={styles.cartEmpty}>
          <span className={styles.emptyIcon}>
            <AuroraIcon name="bag" size={22} />
          </span>
          <strong>Sepetiniz boş</strong>
          <span>Beğendiğiniz ürünün yanındaki + düğmesine dokunun.</span>
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
                        aria-label={item.quantity === 1 ? `${item.name} ürününü kaldır` : `${item.name} adedini azalt`}
                      >
                        <AuroraIcon name={item.quantity === 1 ? "trash" : "minus"} size={15} strokeWidth={2} />
                      </button>
                      <b>{item.quantity}</b>
                      <button
                        type="button"
                        onClick={() => increaseQuantity(item.id)}
                        aria-label={`${item.name} adedini artır`}
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
            <span>Toplam</span>
            <strong>{formatLira(total)}</strong>
          </div>

          {!table && (
            <p className={styles.cartNote}>
              <AuroraIcon name="qr" size={16} />
              Siparişi göndermek için masadaki QR kodu okutmanız gerekir.
            </p>
          )}
        </>
      )}

      <div className={styles.cartActions}>
        {items.length > 0 && (
          <button type="button" className={styles.cta} onClick={onCheckout}>
            <span>Siparişe geç</span>
            <AuroraIcon name="arrow" />
          </button>
        )}
        {onClose && (
          <button type="button" className={styles.ghost} onClick={onClose}>
            Menüye dön
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
  icon,
  title,
  subtitle,
  doneTitle,
  done,
  pending,
  onClick,
}: {
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
        <strong>{pending ? "Gönderiliyor…" : done ? doneTitle : title}</strong>
        <small>{done ? "Talebiniz iletildi · tekrar göndermek için dokunun" : subtitle}</small>
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
  table,
  pendingRequest,
  sentRequests,
  onRequest,
}: {
  table: Table | null;
  pendingRequest: TableRequestType | null;
  sentRequests: TableRequestType[];
  onRequest: (type: TableRequestType) => void;
}) {
  if (!table) {
    return <p className={styles.sideHint}>Garson çağırmak için masadaki QR kodu okutun.</p>;
  }

  const buttons: { type: TableRequestType; icon: AuroraIconName; title: string; done: string }[] = [
    { type: "garson", icon: "bell", title: "Garson çağır", done: "Garson çağrıldı" },
    { type: "hesap", icon: "receipt", title: "Hesap iste", done: "Hesap istendi" },
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
            {pendingRequest === button.type ? "Gönderiliyor…" : done ? button.done : button.title}
          </button>
        );
      })}
    </>
  );
}
