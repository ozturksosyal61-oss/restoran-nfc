"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import ProductCard from "./ProductCard";
import { useCart } from "./CartContext";
import { callNovaWaiter, requestNovaBill } from "./novaActions";

type Category = {
  id: number;
  name: string;
  sort_order?: number;
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
  is_available?: boolean;
  sort_order?: number;
};

type Restaurant = {
  id: number;
  name: string;
  description: string | null;
  phone: string | null;
  address: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  instagram_url: string | null;
  google_review_url: string | null;
  is_open: boolean | null;
  opening_time: string | null;
  closing_time: string | null;
};

function formatPrice(value: number) {
  return `${Number(value || 0).toLocaleString("tr-TR")} TL`;
}

function getSavedTableToken() {
  try {
    return window.localStorage.getItem("ozt_table_token")?.trim() || "";
  } catch {
    return "";
  }
}

export default function AuroraMenu({ slug: slugProp }: { slug?: string }) {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = slugProp || (params.slug as string);

  const {
    items,
    total,
    itemCount,
    increaseQuantity,
    decreaseQuantity,
    removeFromCart,
  } = useCart();

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [tableToken, setTableToken] = useState("");
  const [tableNumber, setTableNumber] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const [serviceOpen, setServiceOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const garsonStatus = searchParams.get("garson") || "";
  const hesapStatus = searchParams.get("hesap") || "";

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const { createClient } = await import("../../../../lib/supabase/client");
        const supabase = createClient();

        const { data: restaurantData, error: restaurantError } = await supabase
          .from("restaurants")
          .select(
            "id,name,description,phone,address,logo_url,cover_image_url,instagram_url,google_review_url,is_open,opening_time,closing_time"
          )
          .eq("slug", slug)
          .eq("is_active", true)
          .maybeSingle();

        if (restaurantError || !restaurantData) {
          if (!cancelled) {
            setError("İşletme bulunamadı.");
            setLoading(false);
          }
          return;
        }

        const { data: categoryData } = await supabase
          .from("categories")
          .select("id,name,sort_order")
          .eq("restaurant_id", restaurantData.id)
          .order("sort_order", { ascending: true });

        const safeCategories = (categoryData || []) as Category[];
        let safeProducts: Product[] = [];

        if (safeCategories.length > 0) {
          const categoryIds = safeCategories.map((category) => category.id);

          const { data: productData } = await supabase
            .from("products")
            .select(
              "id,category_id,name,description,price,image_url,ingredients,allergens,is_available,sort_order"
            )
            .in("category_id", categoryIds)
            .eq("is_available", true)
            .order("sort_order", { ascending: true });

          safeProducts = (productData || []) as Product[];
        }

        let nextTableToken = searchParams.get("masa")?.trim() || "";
        if (!nextTableToken) nextTableToken = getSavedTableToken();

        let nextTableNumber: number | null = null;

        if (nextTableToken) {
          const { data: tableData } = await supabase
            .from("restaurant_tables")
            .select("id,table_number,public_token,is_active")
            .eq("restaurant_id", restaurantData.id)
            .eq("public_token", nextTableToken)
            .eq("is_active", true)
            .maybeSingle();

          if (tableData) {
            nextTableNumber = Number(tableData.table_number);
            try {
              window.localStorage.setItem("ozt_table_token", tableData.public_token);
            } catch {
              // ignore
            }
          } else if (searchParams.get("masa")) {
            nextTableToken = "";
            try {
              window.localStorage.removeItem("ozt_table_token");
            } catch {
              // ignore
            }
          }
        }

        if (cancelled) return;

        setRestaurant(restaurantData as Restaurant);
        setCategories(safeCategories);
        setProducts(safeProducts);
        setTableToken(nextTableToken);
        setTableNumber(nextTableNumber);

        // İlk kategori yerine tüm menüyü göster; referans UX'inde kullanıcı önce menüyü görür.
        setActiveCategory(null);
      } catch (loadError) {
        console.error("Aurora menü yükleme hatası:", loadError);
        if (!cancelled) setError("Menü yüklenirken bir hata oluştu.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [slug, searchParams]);

  useEffect(() => {
    if (!garsonStatus && !hesapStatus) return;

    const message =
      garsonStatus === "ok"
        ? "Garson çağrınız iletildi."
        : garsonStatus === "hata"
        ? "Garson çağrısı gönderilemedi."
        : hesapStatus === "ok"
        ? "Hesap talebiniz iletildi."
        : "Hesap talebi gönderilemedi.";

    setToast(message);

    const cleanUrl = tableToken
      ? `/restoran/${encodeURIComponent(slug)}/menu?masa=${encodeURIComponent(tableToken)}`
      : `/restoran/${encodeURIComponent(slug)}/menu`;

    window.history.replaceState({}, "", cleanUrl);
  }, [garsonStatus, hesapStatus, slug, tableToken]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const normalizedSearch = search.trim().toLocaleLowerCase("tr-TR");

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const categoryMatch =
        activeCategory === null || product.category_id === activeCategory;

      if (!categoryMatch) return false;
      if (!normalizedSearch) return true;

      const searchable = [
        product.name,
        product.description || "",
        product.ingredients || "",
      ]
        .join(" ")
        .toLocaleLowerCase("tr-TR");

      return searchable.includes(normalizedSearch);
    });
  }, [products, activeCategory, normalizedSearch]);

  const featuredProducts = products.slice(0, 4);

  function preserveTableQuery(path: string) {
    const token = tableToken || getSavedTableToken();
    return token ? `${path}?masa=${encodeURIComponent(token)}` : path;
  }

  function goHome() {
    router.push(preserveTableQuery(`/restoran/${encodeURIComponent(slug)}`));
  }

  function goToOrder() {
    if (items.length === 0) {
      setToast("Önce sepetinize ürün ekleyin.");
      return;
    }

    router.push(preserveTableQuery(`/restoran/${encodeURIComponent(slug)}/siparis`));
  }

  function openBill() {
    router.push(preserveTableQuery(`/restoran/${encodeURIComponent(slug)}/odeme`));
  }

  function openLastOrder() {
    const token = tableToken || getSavedTableToken();

    if (!token) {
      setToast("Sipariş takibi için masa bağlantısı bulunamadı.");
      return;
    }

    try {
      const keys = [
        `ozt_last_order_${slug}_${token}`,
        `ozt_last_order_${slug}_${token}`,
      ];

      const orderId = keys
        .map((key) => window.localStorage.getItem(key))
        .find((value) => value && /^\d+$/.test(value || ""));

      if (!orderId) {
        setToast("Bu masa için kayıtlı bir sipariş bulunamadı.");
        return;
      }

      router.push(
        `/restoran/${encodeURIComponent(slug)}/siparis/takip/${encodeURIComponent(
          orderId
        )}?masa=${encodeURIComponent(token)}`
      );
    } catch {
      setToast("Sipariş takibi şu anda açılamıyor.");
    }
  }

  function selectCategory(categoryId: number | null) {
    setActiveCategory(categoryId);

    window.setTimeout(() => {
      document
        .getElementById("aurora-product-area")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  }

  if (loading) {
    return (
      <main className="aurora-menu-page">
        <style>{auroraMenuStyles}</style>
        <div className="aurora-menu-state">
          <div className="aurora-spinner" />
          <strong>Menü hazırlanıyor</strong>
          <span>Lezzetler birazdan burada.</span>
        </div>
      </main>
    );
  }

  if (!restaurant) {
    return (
      <main className="aurora-menu-page">
        <style>{auroraMenuStyles}</style>
        <div className="aurora-menu-state">
          <strong>İşletme bulunamadı.</strong>
          <span>{error}</span>
        </div>
      </main>
    );
  }

  const tableLabel = tableNumber ? `Masa ${tableNumber}` : "Müşteri Menüsü";
  const visibleCategories = activeCategory === null
    ? categories
    : categories.filter((category) => category.id === activeCategory);

  return (
    <main className="aurora-menu-page">
      <style>{auroraMenuStyles}</style>

      <div className="aurora-menu-shell">
        <header className="aurora-menu-header">
          <button type="button" className="aurora-menu-brand" onClick={goHome}>
            <span className="aurora-menu-brand-logo">
              {restaurant.logo_url ? (
                <img src={restaurant.logo_url} alt="" />
              ) : (
                <span>{restaurant.name.slice(0, 1).toUpperCase()}</span>
              )}
            </span>
            <span className="aurora-menu-brand-copy">
              <strong>{restaurant.name}</strong>
              <small>{tableLabel}</small>
            </span>
          </button>

          <div className="aurora-menu-header-actions">
            <button
              type="button"
              className="aurora-menu-round"
              onClick={() => document.getElementById("aurora-search-input")?.focus()}
              aria-label="Ara"
            >
              ⌕
            </button>
            <button
              type="button"
              className="aurora-menu-round"
              onClick={() => setServiceOpen(true)}
              aria-label="Hizmetler"
            >
              ☰
            </button>
          </div>
        </header>

        <div className="aurora-menu-layout">
          <aside className="aurora-menu-sidebar">
            <div className="aurora-menu-sidebar-card">
              <div className="aurora-menu-sidebar-logo">
                {restaurant.logo_url ? (
                  <img src={restaurant.logo_url} alt="" />
                ) : (
                  <span>{restaurant.name.slice(0, 1).toUpperCase()}</span>
                )}
              </div>

              <div className="aurora-menu-sidebar-title">
                {restaurant.name}
              </div>

              <div className="aurora-menu-sidebar-status">
                <span className={restaurant.is_open === false ? "closed" : "open"}>
                  ● {restaurant.is_open === false ? "Kapalı" : "Açık"}
                </span>
              </div>

              <div className="aurora-menu-sidebar-divider" />

              <div className="aurora-menu-sidebar-block">
                <span>HİZMET SAATLERİ</span>
                <strong>Her gün</strong>
                <small>
                  {restaurant.opening_time || "09:00"} — {restaurant.closing_time || "00:00"}
                </small>
              </div>

              <div className="aurora-menu-sidebar-block">
                <span>KONUM</span>
                <strong>Restoran adres bilgisi</strong>
                {restaurant.address ? (
                  <small>{restaurant.address}</small>
                ) : (
                  <small>Adres bilgisi girilmemiş.</small>
                )}
              </div>

              <div className="aurora-menu-sidebar-block">
                <span>MASA</span>
                <strong>{tableNumber ? `Masa ${tableNumber}` : "Masa bağlantısı yok"}</strong>
                <small>QR / NFC bağlantısı aktif</small>
              </div>

              <div className="aurora-menu-sidebar-actions">
                <button type="button" onClick={goHome}>Ana Sayfa</button>
                <button type="button" onClick={() => setServiceOpen(true)}>Hizmet</button>
              </div>
            </div>
          </aside>

          <div className="aurora-menu-main">

        <section className="aurora-menu-hero">
          <div
            className="aurora-menu-hero-image"
            style={
              restaurant.cover_image_url
                ? {
                    backgroundImage: `linear-gradient(180deg, rgba(0,0,0,.10), rgba(0,0,0,.22) 40%, rgba(0,0,0,.84)), url("${restaurant.cover_image_url}")`,
                  }
                : undefined
            }
          >
            {!restaurant.cover_image_url && <div className="aurora-menu-cover-fallback" />}
          </div>

          <div className="aurora-menu-hero-content">
            <span className="aurora-menu-eyebrow">MENU</span>
            <h1>Lezzetini keşfet.</h1>
            <p>
              {restaurant.description ||
                "Menümüzü keşfedin, ürününüzü seçin ve siparişinizi kolayca oluşturun."}
            </p>

            <div className="aurora-menu-hero-meta">
              <span className={restaurant.is_open === false ? "closed" : "open"}>
                ● {restaurant.is_open === false ? "Kapalı" : "Açık"}
              </span>
              {tableNumber ? <span>⌂ Masa {tableNumber}</span> : null}
              <span>✦ {products.length} ürün</span>
            </div>
          </div>
        </section>

        {!restaurant.is_open && (
          <section className="aurora-menu-closed-banner">
            <span>●</span>
            <div>
              <strong>Şu anda kapalıyız</strong>
              <small>Menüyü inceleyebilirsiniz; siparişler işletme açıldığında alınacaktır.</small>
            </div>
          </section>
        )}

        <section className="aurora-menu-toolbar">
          <div>
            <span className="aurora-menu-kicker">MENÜ</span>
            <h2>Bugün ne istersiniz?</h2>
          </div>

          <button
            type="button"
            className="aurora-menu-cart-pill"
            onClick={() => setCartOpen(true)}
          >
            <span>🛒</span>
            <strong>{itemCount}</strong>
            <small>{formatPrice(total)}</small>
          </button>
        </section>

        <label className="aurora-menu-search">
          <span>⌕</span>
          <input
            id="aurora-search-input"
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setActiveCategory(null);
            }}
            placeholder="Menüde ürün ara..."
          />
          {search && (
            <button type="button" onClick={() => setSearch("")} aria-label="Aramayı temizle">
              ×
            </button>
          )}
        </label>

        <section className="aurora-menu-categories">
          <div className="aurora-menu-category-head">
            <div>
              <span className="aurora-menu-kicker">KATEGORİLER</span>
              <strong>{categories.length} kategori</strong>
            </div>
            <span>{products.length} ürün</span>
          </div>

          <div className="aurora-menu-category-scroll">
            <button
              type="button"
              className={activeCategory === null ? "active" : ""}
              onClick={() => selectCategory(null)}
            >
              Tümü
            </button>
            {categories.map((category) => (
              <button
                type="button"
                key={category.id}
                className={activeCategory === category.id ? "active" : ""}
                onClick={() => selectCategory(category.id)}
              >
                {category.name}
              </button>
            ))}
          </div>
        </section>

        {!search.trim() && activeCategory === null && featuredProducts.length > 0 && (
          <section className="aurora-menu-section aurora-menu-featured-section">
            <div className="aurora-menu-section-head">
              <div>
                <span className="aurora-menu-kicker">ÖNE ÇIKANLAR</span>
                <h2>Şefin seçimleri</h2>
              </div>
              <span className="aurora-menu-section-note">Favoriler</span>
            </div>

            <div className="aurora-menu-featured-grid">
              {featuredProducts.map((product) => (
                <article className="aurora-menu-featured-card" key={product.id}>
                  <ProductCard
                    product={{
                      id: product.id,
                      name: product.name,
                      description: product.description,
                      ingredients: product.ingredients,
                      allergens: product.allergens,
                      price: Number(product.price),
                      image_url: product.image_url,
                    }}
                  />
                </article>
              ))}
            </div>
          </section>
        )}

        <section id="aurora-product-area" className="aurora-menu-section aurora-menu-products">
          {visibleCategories.map((category) => {
            const categoryProducts = products.filter(
              (product) => product.category_id === category.id
            );

            if (!categoryProducts.length) return null;

            const categoryFiltered = normalizedSearch
              ? categoryProducts.filter((product) =>
                  [
                    product.name,
                    product.description || "",
                    product.ingredients || "",
                  ]
                    .join(" ")
                    .toLocaleLowerCase("tr-TR")
                    .includes(normalizedSearch)
                )
              : categoryProducts;

            if (!categoryFiltered.length) return null;

            return (
              <section
                className="aurora-menu-category-section"
                key={category.id}
                id={`aurora-category-${category.id}`}
              >
                <div className="aurora-menu-section-head aurora-menu-category-title">
                  <div>
                    <span className="aurora-menu-kicker">
                      {categoryFiltered.length} ürün
                    </span>
                    <h2>{category.name}</h2>
                  </div>
                </div>

                <div className="aurora-menu-product-list">
                  {categoryFiltered.map((product) => (
                    <article className="aurora-menu-product-card" key={product.id}>
                      <ProductCard
                        product={{
                          id: product.id,
                          name: product.name,
                          description: product.description,
                          ingredients: product.ingredients,
                          allergens: product.allergens,
                          price: Number(product.price),
                          image_url: product.image_url,
                        }}
                      />
                    </article>
                  ))}
                </div>
              </section>
            );
          })}

          {filteredProducts.length === 0 && (
            <div className="aurora-menu-empty">
              <strong>Ürün bulunamadı.</strong>
              <span>Aramanızı veya kategori seçiminizi değiştirin.</span>
              <button type="button" onClick={() => { setSearch(""); setActiveCategory(null); }}>
                Menüyü sıfırla
              </button>
            </div>
          )}
        </section>

        </div>
        </div>

        <footer className="aurora-menu-footer">
          <strong>{restaurant.name}</strong>
          <span>OZT DIGITAL · AURORA MENU EXPERIENCE</span>
        </footer>
      </div>

      <nav className="aurora-menu-bottom-nav">
        <button
          type="button"
          className="active"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          <span>▦</span>
          Menü
        </button>
        <button type="button" onClick={openLastOrder}>
          <span>◷</span>
          Siparişlerim
        </button>
        <button type="button" onClick={() => setCartOpen(true)}>
          <span className="aurora-menu-cart-icon">
            🛒
            {itemCount > 0 && <b>{itemCount}</b>}
          </span>
          Sepet
        </button>
        <button type="button" onClick={() => setServiceOpen(true)}>
          <span>♧</span>
          Hizmet
        </button>
        <button type="button" onClick={openBill}>
          <span>▤</span>
          Hesap
        </button>
      </nav>

      {toast && (
        <div className="aurora-menu-toast">
          <span>✓</span>
          {toast}
        </div>
      )}

      {cartOpen && (
        <div className="aurora-menu-overlay" onClick={() => setCartOpen(false)}>
          <section className="aurora-menu-sheet" onClick={(event) => event.stopPropagation()}>
            <div className="aurora-menu-sheet-handle" />
            <div className="aurora-menu-sheet-header">
              <div>
                <span className="aurora-menu-kicker">SEPET</span>
                <h2>Sepetim</h2>
                <small>{itemCount} ürün · {formatPrice(total)}</small>
              </div>
              <button type="button" onClick={() => setCartOpen(false)}>×</button>
            </div>

            {items.length === 0 ? (
              <div className="aurora-menu-empty-cart">
                <div>🛒</div>
                <strong>Sepetiniz boş</strong>
                <span>Menüden ürün seçerek siparişinizi oluşturmaya başlayın.</span>
                <button type="button" onClick={() => setCartOpen(false)}>Menüye Dön</button>
              </div>
            ) : (
              <>
                <div className="aurora-menu-cart-list">
                  {items.map((item) => (
                    <article className="aurora-menu-cart-item" key={item.id}>
                      <div className="aurora-menu-cart-image">
                        {item.image_url ? <img src={item.image_url} alt="" /> : <span>🍽️</span>}
                      </div>
                      <div className="aurora-menu-cart-info">
                        <strong>{item.name}</strong>
                        <span>{formatPrice(Number(item.price))}</span>
                        <div className="aurora-menu-cart-qty">
                          <button type="button" onClick={() => decreaseQuantity(item.id)}>−</button>
                          <b>{item.quantity}</b>
                          <button type="button" onClick={() => increaseQuantity(item.id)}>+</button>
                          <button type="button" className="remove" onClick={() => removeFromCart(item.id)}>Sil</button>
                        </div>
                      </div>
                      <strong className="aurora-menu-cart-total">
                        {formatPrice(Number(item.price) * item.quantity)}
                      </strong>
                    </article>
                  ))}
                </div>

                <div className="aurora-menu-grand-total">
                  <span>Toplam</span>
                  <strong>{formatPrice(total)}</strong>
                </div>

                <button type="button" className="aurora-menu-primary-button" onClick={goToOrder}>
                  Siparişi Tamamla <span>→</span>
                </button>
              </>
            )}
          </section>
        </div>
      )}

      {serviceOpen && (
        <div className="aurora-menu-overlay" onClick={() => setServiceOpen(false)}>
          <section className="aurora-menu-sheet" onClick={(event) => event.stopPropagation()}>
            <div className="aurora-menu-sheet-handle" />
            <div className="aurora-menu-sheet-header">
              <div>
                <span className="aurora-menu-kicker">HİZMET</span>
                <h2>Size nasıl yardımcı olabiliriz?</h2>
                <small>{tableNumber ? `Masa ${tableNumber}` : "Masa bağlantısı yok"}</small>
              </div>
              <button type="button" onClick={() => setServiceOpen(false)}>×</button>
            </div>

            {tableToken ? (
              <div className="aurora-menu-service-list">
                <form action={callNovaWaiter}>
                  <input type="hidden" name="slug" value={slug} />
                  <input type="hidden" name="masa" value={tableToken} />
                  <button type="submit" className="aurora-menu-service-card">
                    <span>🛎️</span>
                    <div>
                      <strong>{garsonStatus === "ok" ? "Garson Çağrıldı" : "Garsonu Çağır"}</strong>
                      <small>Masanıza garson yönlendirin.</small>
                    </div>
                    <b>›</b>
                  </button>
                </form>

                <form action={requestNovaBill}>
                  <input type="hidden" name="slug" value={slug} />
                  <input type="hidden" name="masa" value={tableToken} />
                  <button type="submit" className="aurora-menu-service-card featured">
                    <span>🧾</span>
                    <div>
                      <strong>{hesapStatus === "ok" ? "Hesap İstendi" : "Hesap İste"}</strong>
                      <small>Hesabınızı masanıza getirelim.</small>
                    </div>
                    <b>›</b>
                  </button>
                </form>

                <button type="button" className="aurora-menu-service-card" onClick={openLastOrder}>
                  <span>◷</span>
                  <div>
                    <strong>Siparişlerim</strong>
                    <small>Son siparişinizi açın.</small>
                  </div>
                  <b>›</b>
                </button>

                <button type="button" className="aurora-menu-service-card" onClick={openBill}>
                  <span>₺</span>
                  <div>
                    <strong>Masa Hesabı</strong>
                    <small>Hesap ekranını açın.</small>
                  </div>
                  <b>›</b>
                </button>
              </div>
            ) : (
              <div className="aurora-menu-no-table">
                <strong>QR / NFC masa bağlantısı yok.</strong>
                <span>Garson ve hesap hizmetleri masa bağlantısı ile kullanılabilir.</span>
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  );
}

const auroraMenuStyles = `
.aurora-menu-page,
.aurora-menu-page * { box-sizing: border-box; }

.aurora-menu-page {
  --am-bg: #080706;
  --am-bg2: #12100e;
  --am-panel: rgba(21,20,18,.90);
  --am-panel2: rgba(28,26,23,.78);
  --am-line: rgba(255,255,255,.11);
  --am-text: #f5f1e8;
  --am-muted: rgba(245,241,232,.60);
  --am-soft: rgba(245,241,232,.38);
  --am-gold: #d5bd8d;
  --am-gold2: #b58e50;
  --am-green: #95dfd1;

  min-height: 100vh;
  padding: 0 0 104px;
  color: var(--am-text);
  background:
    radial-gradient(circle at 50% -12%, rgba(169,98,31,.18), transparent 30%),
    radial-gradient(circle at 92% 18%, rgba(114,82,43,.10), transparent 27%),
    linear-gradient(180deg,#070706 0%,#0c0b0a 48%,#050505 100%);
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.aurora-menu-shell {
  width: min(1280px, calc(100% - 34px));
  margin: 0 auto;
}

.aurora-menu-layout {
  display: grid;
  grid-template-columns: 265px minmax(0, 1fr);
  gap: 18px;
  align-items: start;
}

.aurora-menu-sidebar {
  position: sticky;
  top: 90px;
  min-width: 0;
}

.aurora-menu-sidebar-card {
  padding: 18px;
  border-radius: 22px;
  border: 1px solid rgba(255,255,255,.11);
  background: linear-gradient(145deg, rgba(26,24,21,.92), rgba(12,12,11,.87));
  box-shadow: 0 24px 55px rgba(0,0,0,.26), inset 0 1px 0 rgba(255,255,255,.05);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
}

.aurora-menu-sidebar-logo {
  width: 72px;
  height: 72px;
  margin: 2px auto 12px;
  display: grid;
  place-items: center;
  overflow: hidden;
  border-radius: 20px;
  border: 1px solid rgba(215,189,141,.28);
  background: #0c0b0a;
}

.aurora-menu-sidebar-logo img { width:100%; height:100%; object-fit:contain; padding:5px; }
.aurora-menu-sidebar-logo span { color: var(--am-gold); font-size: 20px; font-weight: 950; letter-spacing:2px; }

.aurora-menu-sidebar-title {
  text-align: center;
  color: #fff9f0;
  font-size: 15px;
  font-weight: 950;
}

.aurora-menu-sidebar-status {
  margin-top: 6px;
  text-align:center;
}

.aurora-menu-sidebar-status span {
  font-size:8px;
  font-weight:900;
}

.aurora-menu-sidebar-status .open { color:#bcefe4; }
.aurora-menu-sidebar-status .closed { color:#efbcb7; }

.aurora-menu-sidebar-divider {
  height:1px;
  margin:16px 0 2px;
  background:rgba(255,255,255,.08);
}

.aurora-menu-sidebar-block {
  padding:14px 0;
  border-bottom:1px solid rgba(255,255,255,.07);
}

.aurora-menu-sidebar-block:last-of-type { border-bottom:0; }

.aurora-menu-sidebar-block > span {
  display:block;
  color:rgba(255,255,255,.33);
  font-size:7px;
  font-weight:950;
  letter-spacing:1.8px;
}

.aurora-menu-sidebar-block strong {
  display:block;
  margin-top:6px;
  color:rgba(255,255,255,.88);
  font-size:9px;
  line-height:1.3;
}

.aurora-menu-sidebar-block small {
  display:block;
  margin-top:3px;
  color:rgba(255,255,255,.45);
  font-size:8px;
  line-height:1.45;
}

.aurora-menu-sidebar-actions {
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:7px;
  margin-top:14px;
}

.aurora-menu-sidebar-actions button {
  min-height:36px;
  border-radius:11px;
  border:1px solid rgba(255,255,255,.09);
  background:rgba(255,255,255,.05);
  color:#fff;
  font-size:7px;
  font-weight:900;
  cursor:pointer;
}

.aurora-menu-main { min-width:0; }

.aurora-menu-header {
  position: sticky;
  top: 0;
  z-index: 80;
  min-height: 72px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 11px 3px;
  background: rgba(7,7,6,.80);
  border-bottom: 1px solid rgba(255,255,255,.08);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
}

.aurora-menu-brand {
  display: flex;
  align-items: center;
  gap: 11px;
  min-width: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  text-align: left;
}

.aurora-menu-brand-logo {
  width: 47px;
  height: 47px;
  flex: 0 0 47px;
  display: grid;
  place-items: center;
  overflow: hidden;
  border-radius: 14px;
  border: 1px solid rgba(215,189,141,.30);
  background: #0d0c0a;
}

.aurora-menu-brand-logo img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 5px;
}

.aurora-menu-brand-logo > span {
  color: var(--am-gold);
  font-size: 16px;
  font-weight: 950;
  letter-spacing: 2px;
}

.aurora-menu-brand-copy {
  min-width: 0;
  display: grid;
  gap: 3px;
}

.aurora-menu-brand-copy strong {
  font-size: 14px;
  line-height: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.aurora-menu-brand-copy small {
  color: var(--am-soft);
  font-size: 8px;
  font-weight: 800;
}

.aurora-menu-header-actions {
  display: flex;
  gap: 8px;
}

.aurora-menu-round {
  width: 37px;
  height: 37px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  border: 1px solid var(--am-line);
  background: rgba(255,255,255,.035);
  color: var(--am-text);
  font-size: 17px;
  cursor: pointer;
}

.aurora-menu-hero {
  position: relative;
  min-height: 315px;
  overflow: hidden;
  border-radius: 26px;
  border: 1px solid rgba(255,255,255,.12);
  background: #110e0b;
  box-shadow: 0 30px 90px rgba(0,0,0,.36);
}

.aurora-menu-hero-image,
.aurora-menu-cover-fallback {
  position: absolute;
  inset: 0;
}

.aurora-menu-hero-image {
  background-position: center;
  background-size: cover;
}

.aurora-menu-cover-fallback {
  background:
    radial-gradient(circle at 60% 28%, rgba(201,152,85,.33), transparent 24%),
    radial-gradient(circle at 34% 65%, rgba(74,120,107,.20), transparent 28%),
    linear-gradient(180deg,#352518,#15110d 55%,#070707);
}

.aurora-menu-hero-content {
  position: absolute;
  left: 34px;
  right: 34px;
  bottom: 30px;
  z-index: 2;
  max-width: 720px;
}

.aurora-menu-eyebrow,
.aurora-menu-kicker {
  color: var(--am-gold);
  font-size: 8px;
  font-weight: 950;
  letter-spacing: 2.4px;
  text-transform: uppercase;
}

.aurora-menu-hero h1 {
  margin: 8px 0 0;
  font-family: Georgia, "Times New Roman", serif;
  font-size: clamp(36px, 4.4vw, 56px);
  line-height: .95;
  letter-spacing: -.8px;
}

.aurora-menu-hero p {
  max-width: 620px;
  margin: 12px 0 0;
  color: rgba(255,255,255,.74);
  font-size: 11px;
  line-height: 1.55;
}

.aurora-menu-hero-meta {
  margin-top: 14px;
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.aurora-menu-hero-meta span {
  min-height: 30px;
  display: inline-flex;
  align-items: center;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,.12);
  background: rgba(12,11,10,.54);
  color: rgba(255,255,255,.80);
  font-size: 8px;
  font-weight: 850;
  backdrop-filter: blur(12px);
}

.aurora-menu-hero-meta .open { color: #c8f4e9; }
.aurora-menu-hero-meta .closed { color: #efc5c1; }

.aurora-menu-closed-banner {
  margin-top: 12px;
  padding: 12px 14px;
  display: flex;
  gap: 10px;
  align-items: flex-start;
  border-radius: 15px;
  border: 1px solid rgba(216,129,120,.18);
  background: rgba(93,37,31,.17);
}

.aurora-menu-closed-banner > span { color: #df8279; font-size: 12px; }
.aurora-menu-closed-banner strong { display:block; font-size: 10px; }
.aurora-menu-closed-banner small { display:block; margin-top:3px; color:rgba(255,255,255,.52); font-size:8px; line-height:1.4; }

.aurora-menu-toolbar {
  margin-top: 28px;
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 16px;
}

.aurora-menu-toolbar h2 {
  margin: 5px 0 0;
  font-family: Georgia, "Times New Roman", serif;
  font-size: 30px;
  line-height: .98;
}

.aurora-menu-cart-pill {
  min-height: 48px;
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 0 13px;
  border-radius: 15px;
  border: 1px solid rgba(215,189,141,.20);
  background: linear-gradient(145deg, rgba(31,29,26,.88), rgba(15,14,13,.82));
  color: white;
  cursor: pointer;
}

.aurora-menu-cart-pill strong { font-size: 10px; }
.aurora-menu-cart-pill small { color: rgba(255,255,255,.50); font-size: 8px; }

.aurora-menu-search {
  margin-top: 14px;
  min-height: 53px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 14px;
  border-radius: 17px;
  border: 1px solid var(--am-line);
  background: rgba(255,255,255,.035);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.03);
}

.aurora-menu-search > span { color: var(--am-gold); font-size: 18px; }
.aurora-menu-search input { flex: 1; min-width: 0; border:0; outline:0; background:transparent; color:var(--am-text); font: inherit; font-size: 10px; }
.aurora-menu-search input::placeholder { color: rgba(255,255,255,.35); }
.aurora-menu-search button { width:28px; height:28px; border:0; border-radius:50%; background:rgba(255,255,255,.08); color:white; cursor:pointer; }

.aurora-menu-categories {
  margin-top: 17px;
  padding: 14px 15px 15px;
  border-radius: 19px;
  border: 1px solid var(--am-line);
  background: linear-gradient(145deg, rgba(27,25,22,.74), rgba(12,12,11,.74));
}

.aurora-menu-category-head {
  display:flex;
  justify-content:space-between;
  align-items:end;
  gap: 12px;
}

.aurora-menu-category-head strong { display:block; margin-top:3px; font-size:12px; }
.aurora-menu-category-head > span { color:var(--am-soft); font-size:8px; }

.aurora-menu-category-scroll {
  margin-top: 11px;
  display:flex;
  gap:7px;
  overflow-x:auto;
  padding-bottom:2px;
  scrollbar-width:none;
}

.aurora-menu-category-scroll::-webkit-scrollbar { display:none; }

.aurora-menu-category-scroll button {
  flex:0 0 auto;
  min-height: 37px;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.035);
  color: rgba(255,255,255,.64);
  font-size: 8px;
  font-weight: 900;
  cursor:pointer;
  white-space:nowrap;
}

.aurora-menu-category-scroll button.active {
  background: linear-gradient(135deg,#e1cb9b,#b4955e);
  border-color: rgba(255,232,179,.35);
  color:#19130c;
}

.aurora-menu-section { margin-top: 28px; }

.aurora-menu-section-head {
  padding: 0 4px 12px;
  display:flex;
  align-items:end;
  justify-content:space-between;
  gap: 16px;
}

.aurora-menu-section-head h2 {
  margin: 5px 0 0;
  font-family: Georgia, "Times New Roman", serif;
  font-size: 28px;
  line-height: .95;
}

.aurora-menu-section-note { color:var(--am-soft); font-size:8px; }

.aurora-menu-featured-grid {
  display:grid;
  grid-template-columns: repeat(4,minmax(0,1fr));
  gap: 10px;
}

.aurora-menu-featured-card,
.aurora-menu-product-card {
  min-width:0;
  overflow:hidden;
  border-radius: 18px;
  border: 1px solid rgba(255,255,255,.10);
  background: linear-gradient(145deg, rgba(28,26,23,.84), rgba(15,14,13,.78));
  box-shadow: 0 13px 33px rgba(0,0,0,.19), inset 0 1px 0 rgba(255,255,255,.03);
}

.aurora-menu-featured-card .customer-product,
.aurora-menu-product-card .customer-product {
  background: transparent !important;
  border: 0 !important;
  box-shadow:none !important;
  color:inherit !important;
}

.aurora-menu-featured-card .customer-product {
  display:grid !important;
  grid-template-rows: 190px auto !important;
  min-height: 300px !important;
}

.aurora-menu-featured-card .customer-product-image-wrap {
  width:100% !important;
  height:190px !important;
  min-height:190px !important;
  border:0 !important;
  border-radius:0 !important;
}

.aurora-menu-featured-card .customer-product-info {
  padding: 12px 13px 7px !important;
}

.aurora-menu-featured-card .customer-product-info h3,
.aurora-menu-product-card .customer-product-info h3 {
  color:#f7f1e5 !important;
  font-size:13px !important;
  font-weight:950 !important;
}

.aurora-menu-featured-card .customer-product-info p,
.aurora-menu-product-card .customer-product-info p {
  color:rgba(255,255,255,.48) !important;
  font-size:8px !important;
  line-height:1.4 !important;
  -webkit-line-clamp:2 !important;
}

.aurora-menu-featured-card .customer-product-price,
.aurora-menu-product-card .customer-product-price {
  color:var(--am-gold) !important;
  font-size:13px !important;
  font-weight:950 !important;
}

.aurora-menu-featured-card .add-to-cart-button,
.aurora-menu-product-card .add-to-cart-button {
  width:34px !important;
  height:34px !important;
  min-width:34px !important;
  border-radius:50% !important;
  border:1px solid rgba(255,230,180,.18) !important;
  background:linear-gradient(135deg,#e0c68f,#a77d3f) !important;
  color:#171109 !important;
}

.aurora-menu-products { margin-top: 30px; }
.aurora-menu-category-section { margin-top: 30px; scroll-margin-top: 82px; }
.aurora-menu-category-title { padding-bottom: 9px; }

.aurora-menu-product-list { display:grid; gap:8px; }

.aurora-menu-product-card .customer-product {
  min-height: 112px !important;
  display:grid !important;
  grid-template-columns: 104px minmax(0,1fr) !important;
  align-items:center !important;
  gap: 12px !important;
  padding: 8px !important;
}

.aurora-menu-product-card .customer-product-image-wrap {
  width:104px !important;
  height:96px !important;
  min-height:96px !important;
  border-radius:14px !important;
  border:0 !important;
}

.aurora-menu-product-card .customer-product-info { min-width:0 !important; padding:0 !important; }
.aurora-menu-product-card .customer-product-right { right:9px !important; bottom:9px !important; }
.aurora-menu-product-card .customer-product-price { margin-top:7px !important; }

.aurora-menu-empty {
  margin-top: 25px;
  padding: 35px 22px;
  text-align:center;
  border-radius:20px;
  border:1px dashed rgba(255,255,255,.12);
  background:rgba(255,255,255,.025);
}

.aurora-menu-empty strong { display:block; font-size:15px; }
.aurora-menu-empty span { display:block; margin-top:5px; color:var(--am-muted); font-size:9px; }
.aurora-menu-empty button { margin-top:11px; min-height:40px; padding:0 14px; border:1px solid rgba(255,255,255,.10); border-radius:11px; background:rgba(255,255,255,.06); color:white; cursor:pointer; font-size:9px; font-weight:900; }

.aurora-menu-footer { padding:45px 0 10px; text-align:center; display:grid; gap:4px; color:var(--am-soft); }
.aurora-menu-footer strong { color:rgba(255,255,255,.64); font-size:9px; letter-spacing:1px; }
.aurora-menu-footer span { font-size:7px; letter-spacing:1.7px; }

.aurora-menu-bottom-nav {
  position:fixed;
  left:50%;
  bottom:9px;
  z-index:90;
  transform:translateX(-50%);
  width:min(520px,calc(100% - 18px));
  min-height:64px;
  padding:5px;
  display:grid;
  grid-template-columns:repeat(5,minmax(0,1fr));
  gap:3px;
  border-radius:20px;
  border:1px solid rgba(255,255,255,.12);
  background:rgba(21,20,18,.94);
  box-shadow:0 20px 45px rgba(0,0,0,.48), inset 0 1px 0 rgba(255,255,255,.05);
  backdrop-filter:blur(18px);
  -webkit-backdrop-filter:blur(18px);
}

.aurora-menu-bottom-nav button {
  border:0;
  border-radius:14px;
  background:transparent;
  color:rgba(255,255,255,.50);
  display:grid;
  place-items:center;
  align-content:center;
  gap:3px;
  font-size:7px;
  font-weight:900;
  cursor:pointer;
}

.aurora-menu-bottom-nav button.active { color:white; background:rgba(255,255,255,.09); }
.aurora-menu-bottom-nav button > span { font-size:15px; }

.aurora-menu-cart-icon { position:relative; }
.aurora-menu-cart-icon b {
  position:absolute;
  top:-7px;
  right:-8px;
  min-width:15px;
  height:15px;
  display:grid;
  place-items:center;
  padding:0 3px;
  border-radius:999px;
  border:2px solid #171614;
  background:#d1ad72;
  color:#21170b;
  font-size:7px;
}

.aurora-menu-overlay {
  position:fixed;
  inset:0;
  z-index:120;
  display:flex;
  align-items:flex-end;
  justify-content:center;
  padding:10px;
  background:rgba(0,0,0,.67);
  backdrop-filter:blur(7px);
  -webkit-backdrop-filter:blur(7px);
}

.aurora-menu-sheet {
  width:min(100%,560px);
  max-height:88dvh;
  overflow-y:auto;
  padding:8px 15px 18px;
  border-radius:27px 27px 19px 19px;
  border:1px solid rgba(255,255,255,.12);
  background:linear-gradient(145deg,#1b1916,#0e0e0d);
  box-shadow:0 32px 95px rgba(0,0,0,.63);
}

.aurora-menu-sheet-handle { width:44px; height:4px; margin:1px auto 14px; border-radius:99px; background:rgba(255,255,255,.16); }
.aurora-menu-sheet-header { display:flex; align-items:flex-start; justify-content:space-between; gap:10px; padding-bottom:14px; border-bottom:1px solid rgba(255,255,255,.08); }
.aurora-menu-sheet-header h2 { margin:5px 0 0; font-family:Georgia,"Times New Roman",serif; font-size:26px; line-height:1; }
.aurora-menu-sheet-header small { display:block; margin-top:5px; color:rgba(255,255,255,.40); font-size:8px; }
.aurora-menu-sheet-header > button { width:35px; height:35px; border:1px solid rgba(255,255,255,.08); border-radius:50%; background:rgba(255,255,255,.06); color:white; font-size:18px; cursor:pointer; }

.aurora-menu-cart-list,
.aurora-menu-service-list { display:grid; gap:8px; margin-top:14px; }

.aurora-menu-cart-item {
  display:grid;
  grid-template-columns:62px minmax(0,1fr) auto;
  gap:9px;
  align-items:center;
  padding:6px;
  border-radius:16px;
  background:rgba(255,255,255,.045);
  border:1px solid rgba(255,255,255,.07);
}

.aurora-menu-cart-image,
.aurora-menu-cart-image img { width:62px; height:62px; border-radius:12px; }
.aurora-menu-cart-image { overflow:hidden; display:grid; place-items:center; background:#171614; color:rgba(255,255,255,.35); }
.aurora-menu-cart-image img { object-fit:cover; }
.aurora-menu-cart-info { min-width:0; }
.aurora-menu-cart-info > strong { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:10px; }
.aurora-menu-cart-info > span { display:block; margin-top:3px; color:var(--am-gold); font-size:8px; font-weight:900; }
.aurora-menu-cart-qty { margin-top:6px; display:flex; align-items:center; gap:4px; }
.aurora-menu-cart-qty button { min-width:26px; height:26px; padding:0 6px; border:1px solid rgba(255,255,255,.08); border-radius:8px; background:rgba(255,255,255,.05); color:white; font-size:10px; cursor:pointer; }
.aurora-menu-cart-qty b { min-width:17px; text-align:center; font-size:9px; }
.aurora-menu-cart-qty .remove { color:#ebb0aa; }
.aurora-menu-cart-total { font-size:9px; }

.aurora-menu-grand-total { margin-top:14px; padding:13px 2px; display:flex; justify-content:space-between; border-top:1px solid rgba(255,255,255,.08); }
.aurora-menu-grand-total span { color:rgba(255,255,255,.43); font-size:9px; }
.aurora-menu-grand-total strong { color:white; font-size:17px; }
.aurora-menu-primary-button { width:100%; min-height:54px; border:1px solid rgba(255,231,181,.28); border-radius:15px; background:linear-gradient(135deg,#e1c992,#b18b4e); color:#19120b; font-size:12px; font-weight:950; cursor:pointer; }

.aurora-menu-empty-cart { padding:30px 18px; text-align:center; }
.aurora-menu-empty-cart > div { font-size:38px; }
.aurora-menu-empty-cart strong { display:block; margin-top:7px; font-size:14px; }
.aurora-menu-empty-cart span { display:block; margin-top:5px; color:rgba(255,255,255,.44); font-size:9px; line-height:1.4; }
.aurora-menu-empty-cart button { margin-top:11px; min-height:40px; padding:0 14px; border:1px solid rgba(255,255,255,.08); border-radius:11px; background:rgba(255,255,255,.06); color:white; font-size:9px; font-weight:900; cursor:pointer; }

.aurora-menu-service-card {
  width:100%;
  min-height:76px;
  display:grid;
  grid-template-columns:43px minmax(0,1fr) 20px;
  align-items:center;
  gap:9px;
  padding:11px;
  border:1px solid rgba(255,255,255,.09);
  border-radius:17px;
  background:rgba(255,255,255,.045);
  color:white;
  text-align:left;
  cursor:pointer;
}

.aurora-menu-service-card.featured { background:linear-gradient(145deg, rgba(119,95,59,.74), rgba(73,55,31,.74)); }
.aurora-menu-service-card > span { width:43px; height:43px; display:grid; place-items:center; border-radius:13px; background:rgba(255,255,255,.07); font-size:18px; }
.aurora-menu-service-card strong { display:block; font-size:10px; font-weight:950; }
.aurora-menu-service-card small { display:block; margin-top:3px; color:rgba(255,255,255,.45); font-size:8px; line-height:1.3; }
.aurora-menu-service-card b { color:rgba(255,255,255,.46); font-size:20px; }

.aurora-menu-no-table { padding:30px 8px; text-align:center; display:grid; gap:5px; }
.aurora-menu-no-table strong { font-size:11px; }
.aurora-menu-no-table span { color:rgba(255,255,255,.42); font-size:8px; }

.aurora-menu-toast {
  position:fixed;
  left:50%;
  bottom:86px;
  z-index:150;
  transform:translateX(-50%);
  width:min(calc(100% - 22px),460px);
  min-height:42px;
  padding:0 12px;
  display:flex;
  align-items:center;
  justify-content:center;
  gap:7px;
  border-radius:13px;
  background:#171513;
  border:1px solid rgba(255,255,255,.10);
  color:#f5ead7;
  box-shadow:0 14px 35px rgba(0,0,0,.34);
  font-size:9px;
  font-weight:900;
  text-align:center;
}

.aurora-menu-toast span { color:#bfeee3; font-size:14px; }

.aurora-menu-state { min-height:100vh; display:grid; place-items:center; align-content:center; gap:6px; padding:25px; text-align:center; color:rgba(255,255,255,.55); }
.aurora-spinner { width:29px; height:29px; border-radius:50%; border:3px solid rgba(255,255,255,.12); border-top-color:var(--am-gold); animation:aurora-spin .8s linear infinite; }
@keyframes aurora-spin { to { transform:rotate(360deg); } }

/* =========================================================
   AURORA ÜRÜN MODALI — SADECE AURORA
========================================================= */

.aurora-menu-page .product-modal-overlay {
  position:fixed !important;
  inset:0 !important;
  z-index:99999 !important;
  padding:16px !important;
  display:flex !important;
  align-items:center !important;
  justify-content:center !important;
  background:rgba(0,0,0,.74) !important;
  backdrop-filter:blur(8px) !important;
  -webkit-backdrop-filter:blur(8px) !important;
}

.aurora-menu-page .product-modal {
  position:relative !important;
  width:min(100%,480px) !important;
  max-height:90dvh !important;
  margin:0 !important;
  display:flex !important;
  flex-direction:column !important;
  overflow:hidden !important;
  border-radius:24px !important;
  border:1px solid rgba(255,255,255,.12) !important;
  background:#12110f !important;
  color:#f5efe4 !important;
  box-shadow:0 30px 90px rgba(0,0,0,.65) !important;
}

.aurora-menu-page .product-modal-image-area {
  flex:0 0 250px !important;
  height:250px !important;
  min-height:250px !important;
  overflow:hidden !important;
}

.aurora-menu-page .product-modal-image { width:100% !important; height:100% !important; object-fit:cover !important; }
.aurora-menu-page .product-modal-content { min-height:0 !important; flex:1 1 auto !important; overflow-y:auto !important; padding:20px 19px 88px !important; }
.aurora-menu-page .product-modal-close { top:12px !important; right:12px !important; width:40px !important; height:40px !important; border:0 !important; border-radius:50% !important; background:rgba(10,9,8,.66) !important; color:white !important; font-size:26px !important; z-index:10 !important; }
.aurora-menu-page .product-modal-heading h2 { margin:0 !important; padding-right:38px !important; color:#fff8ee !important; font:700 30px/1.05 Georgia,"Times New Roman",serif !important; }
.aurora-menu-page .product-modal-line { margin-top:12px !important; color:var(--am-gold) !important; }
.aurora-menu-page .product-modal-price { margin-top:12px !important; color:var(--am-gold) !important; font-size:22px !important; font-weight:950 !important; }
.aurora-menu-page .product-modal-description { color:rgba(255,255,255,.60) !important; font-size:11px !important; line-height:1.6 !important; }
.aurora-menu-page .product-modal-info-box,
.aurora-menu-page .product-modal-allergen-box { margin-top:11px !important; border:1px solid rgba(255,255,255,.07) !important; border-radius:14px !important; background:rgba(255,255,255,.045) !important; color:rgba(255,255,255,.72) !important; }
.aurora-menu-page .product-modal-info-title { color:#eee4d2 !important; }
.aurora-menu-page .quantity-selector { background:rgba(255,255,255,.045) !important; border:1px solid rgba(255,255,255,.09) !important; border-radius:30px !important; }
.aurora-menu-page .quantity-selector button { border:1px solid rgba(213,189,141,.35) !important; color:var(--am-gold) !important; background:transparent !important; }
.aurora-menu-page .product-modal-total { background:linear-gradient(135deg,#e0c58f,#aa844b) !important; color:#19120a !important; border:1px solid rgba(255,228,175,.28) !important; border-radius:14px !important; }
.aurora-menu-page .product-modal .product-modal-add { background:linear-gradient(135deg,#e0c58f,#aa844b) !important; color:#19120a !important; border:1px solid rgba(255,228,175,.28) !important; border-radius:15px !important; }

@media (max-width: 900px) {
  .aurora-menu-shell { width:min(760px,calc(100% - 22px)); }
  .aurora-menu-featured-grid { grid-template-columns:repeat(2,minmax(0,1fr)); }
}

@media (max-width: 700px) {
  .aurora-menu-shell { width:100%; }
  .aurora-menu-layout { display:block; }
  .aurora-menu-sidebar { display:none; }
  .aurora-menu-main { width:100%; }
  .aurora-menu-header { padding-left:11px; padding-right:11px; }
  .aurora-menu-hero { min-height:420px; border-radius:0 0 24px 24px; }
  .aurora-menu-hero-content { left:20px; right:20px; bottom:22px; }
  .aurora-menu-hero h1 { font-size:42px; }
  .aurora-menu-toolbar,
  .aurora-menu-search,
  .aurora-menu-categories,
  .aurora-menu-section,
  .aurora-menu-footer { margin-left:11px; margin-right:11px; }
  .aurora-menu-toolbar h2 { font-size:25px; }
  .aurora-menu-cart-pill { min-height:44px; }
  .aurora-menu-featured-grid { grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; }
  .aurora-menu-featured-card .customer-product { grid-template-rows:145px auto !important; min-height:250px !important; }
  .aurora-menu-featured-card .customer-product-image-wrap { height:145px !important; min-height:145px !important; }
  .aurora-menu-featured-card .customer-product-info { padding:9px 10px 6px !important; }
  .aurora-menu-featured-card .customer-product-info h3 { font-size:11px !important; }
  .aurora-menu-product-card .customer-product { min-height:102px !important; grid-template-columns:88px minmax(0,1fr) !important; gap:9px !important; padding:7px !important; }
  .aurora-menu-product-card .customer-product-image-wrap { width:88px !important; height:84px !important; min-height:84px !important; }
  .aurora-menu-product-card .customer-product-info h3 { font-size:11px !important; }
  .aurora-menu-product-card .customer-product-info p { font-size:7px !important; }
  .aurora-menu-product-card .customer-product-price { font-size:12px !important; }
  .aurora-menu-page .product-modal-overlay { padding:8px !important; }
  .aurora-menu-page .product-modal { width:100% !important; max-height:calc(100dvh - 16px) !important; border-radius:21px !important; }
  .aurora-menu-page .product-modal-image-area { flex-basis:190px !important; height:190px !important; min-height:190px !important; }
  .aurora-menu-page .product-modal-content { padding:18px 17px 90px !important; }
}

@media (max-width: 420px) {
  .aurora-menu-brand-copy strong { max-width:145px; }
  .aurora-menu-hero { min-height:390px; }
  .aurora-menu-hero h1 { font-size:38px; }
  .aurora-menu-featured-grid { grid-template-columns:repeat(2,minmax(0,1fr)); }
  .aurora-menu-category-scroll button { padding:0 12px; }
}

/* =========================================================
   AURORA MENU — FINAL VISUAL PASS
   Yalnızca Aurora menü scope'u içinde çalışır.
========================================================= */
.aurora-menu-page {
  background:
    radial-gradient(circle at 50% -14%, rgba(160,93,32,.16), transparent 32%),
    linear-gradient(180deg,#060606 0%,#0a0908 45%,#050505 100%);
}

.aurora-menu-shell {
  width:min(1180px,calc(100% - 32px));
}

.aurora-menu-header {
  min-height:74px !important;
  padding:0 2px !important;
  border-bottom:1px solid rgba(255,255,255,.08) !important;
}

.aurora-menu-brand-logo {
  width:42px !important;
  height:42px !important;
  border-radius:14px !important;
  border:1px solid rgba(216,190,145,.28) !important;
  background:#0d0c0b !important;
}

.aurora-menu-brand-copy strong {
  color:#f6f0e6 !important;
  font-size:13px !important;
}

.aurora-menu-brand-copy small {
  color:rgba(255,255,255,.40) !important;
}

.aurora-menu-layout {
  grid-template-columns:225px minmax(0,1fr) !important;
  gap:22px !important;
}

.aurora-menu-sidebar {
  top:90px !important;
}

.aurora-menu-sidebar-card {
  border-radius:20px !important;
  padding:17px !important;
  background:linear-gradient(150deg,rgba(24,22,19,.94),rgba(11,11,10,.90)) !important;
  border-color:rgba(255,255,255,.10) !important;
  box-shadow:0 26px 60px rgba(0,0,0,.24), inset 0 1px 0 rgba(255,255,255,.05) !important;
}

.aurora-menu-sidebar-logo {
  width:68px !important;
  height:68px !important;
  margin-bottom:10px !important;
}

.aurora-menu-sidebar-title {
  font-size:14px !important;
}

.aurora-menu-main {
  min-width:0;
}

/* HERO */
.aurora-menu-hero {
  min-height:268px !important;
  border-radius:24px !important;
  border-color:rgba(255,255,255,.14) !important;
  box-shadow:0 28px 80px rgba(0,0,0,.34) !important;
}

.aurora-menu-hero-image {
  filter:saturate(.93) contrast(1.02) brightness(.84);
}

.aurora-menu-hero-content {
  left:28px !important;
  right:28px !important;
  bottom:24px !important;
  max-width:680px !important;
}

.aurora-menu-hero h1 {
  font-size:clamp(34px,4vw,52px) !important;
  letter-spacing:-.7px !important;
}

.aurora-menu-hero p {
  max-width:540px !important;
  margin-top:9px !important;
  color:rgba(255,255,255,.68) !important;
}

.aurora-menu-hero-meta span {
  min-height:28px !important;
  background:rgba(8,8,7,.52) !important;
  border-color:rgba(255,255,255,.12) !important;
}

/* TOOLBAR */
.aurora-menu-toolbar {
  margin-top:24px !important;
}

.aurora-menu-toolbar h2 {
  font-size:29px !important;
}

.aurora-menu-cart-pill {
  min-height:44px !important;
  border-radius:14px !important;
  background:rgba(255,255,255,.035) !important;
}

/* SEARCH */
.aurora-menu-search {
  margin-top:11px !important;
  min-height:49px !important;
  border-radius:15px !important;
  background:rgba(255,255,255,.025) !important;
  border-color:rgba(255,255,255,.09) !important;
}

/* CATEGORY AREA */
.aurora-menu-categories {
  margin-top:11px !important;
  padding:11px 12px 12px !important;
  border-radius:18px !important;
  background:rgba(255,255,255,.022) !important;
  border-color:rgba(255,255,255,.08) !important;
}

.aurora-menu-category-head {
  display:none !important;
}

.aurora-menu-category-scroll {
  margin-top:0 !important;
  gap:6px !important;
}

.aurora-menu-category-scroll button {
  min-height:34px !important;
  padding:0 13px !important;
  font-size:8px !important;
  background:rgba(255,255,255,.035) !important;
  border-color:rgba(255,255,255,.09) !important;
}

.aurora-menu-category-scroll button.active {
  background:linear-gradient(135deg,#ead5a2,#b89458) !important;
  border-color:rgba(255,231,181,.40) !important;
  color:#19130d !important;
}

/* SECTION HEADINGS */
.aurora-menu-section {
  margin-top:27px !important;
}

.aurora-menu-section-head {
  padding:0 2px 10px !important;
}

.aurora-menu-section-head h2 {
  font-size:27px !important;
}

.aurora-menu-kicker,
.aurora-menu-eyebrow {
  color:#d8c294 !important;
  letter-spacing:2.1px !important;
}

/* FEATURED CARDS */
.aurora-menu-featured-grid {
  grid-template-columns:repeat(4,minmax(0,1fr)) !important;
  gap:9px !important;
}

.aurora-menu-featured-card {
  border-radius:17px !important;
  background:linear-gradient(145deg,rgba(29,27,23,.90),rgba(13,13,12,.84)) !important;
  border-color:rgba(255,255,255,.09) !important;
}

.aurora-menu-featured-card .customer-product {
  grid-template-rows:166px auto !important;
  min-height:270px !important;
}

.aurora-menu-featured-card .customer-product-image-wrap {
  height:166px !important;
  min-height:166px !important;
  border-radius:0 !important;
  background:#161412 !important;
}

.aurora-menu-featured-card .customer-product-info {
  padding:10px 11px 8px !important;
}

.aurora-menu-featured-card .customer-product-info h3 {
  font-size:12px !important;
  color:#fff8ee !important;
}

.aurora-menu-featured-card .customer-product-info p {
  margin-top:4px !important;
  font-size:8px !important;
  color:rgba(255,255,255,.45) !important;
}

.aurora-menu-featured-card .customer-product-price {
  margin-top:6px !important;
  font-size:12px !important;
  color:#dbc394 !important;
}

.aurora-menu-featured-card .add-to-cart-button {
  width:33px !important;
  height:33px !important;
  min-width:33px !important;
  min-height:33px !important;
  background:linear-gradient(135deg,#e5cb91,#aa8143) !important;
  color:#171109 !important;
  border:1px solid rgba(255,231,181,.22) !important;
}

/* PRODUCT SECTIONS — 2 KOLON DESKTOP */
.aurora-menu-product-list {
  display:grid !important;
  grid-template-columns:repeat(2,minmax(0,1fr)) !important;
  gap:10px !important;
}

.aurora-menu-product-card {
  border-radius:17px !important;
  background:linear-gradient(145deg,rgba(25,24,21,.90),rgba(12,12,11,.86)) !important;
  border-color:rgba(255,255,255,.09) !important;
}

.aurora-menu-product-card .customer-product {
  min-height:118px !important;
  grid-template-columns:108px minmax(0,1fr) !important;
  gap:12px !important;
  padding:8px !important;
}

.aurora-menu-product-card .customer-product-image-wrap {
  width:108px !important;
  height:102px !important;
  min-height:102px !important;
  border-radius:13px !important;
  background:#171513 !important;
}

.aurora-menu-product-card .customer-product-info {
  min-width:0 !important;
  padding:0 !important;
}

.aurora-menu-product-card .customer-product-info h3 {
  font-size:13px !important;
  color:#fff8ee !important;
}

.aurora-menu-product-card .customer-product-info p {
  margin-top:4px !important;
  font-size:8px !important;
  line-height:1.4 !important;
  color:rgba(255,255,255,.46) !important;
}

.aurora-menu-product-card .customer-product-price {
  margin-top:7px !important;
  font-size:13px !important;
  color:#dbc394 !important;
}

.aurora-menu-product-card .customer-product-right {
  right:9px !important;
  bottom:9px !important;
}

.aurora-menu-product-card .add-to-cart-button {
  width:35px !important;
  height:35px !important;
  min-width:35px !important;
  min-height:35px !important;
  background:linear-gradient(135deg,#e5cb91,#aa8143) !important;
  color:#171109 !important;
  border:1px solid rgba(255,231,181,.22) !important;
}

/* BOTTOM NAV — SAME AURORA LANGUAGE */
.aurora-menu-bottom-nav {
  width:min(520px,calc(100% - 28px)) !important;
  min-height:56px !important;
  padding:5px !important;
  border-radius:18px !important;
  background:rgba(22,21,19,.94) !important;
  border-color:rgba(255,255,255,.13) !important;
  box-shadow:0 20px 60px rgba(0,0,0,.48),inset 0 1px 0 rgba(255,255,255,.06) !important;
}

.aurora-menu-bottom-nav button {
  border-radius:13px !important;
}

.aurora-menu-bottom-nav button.active {
  background:rgba(255,255,255,.09) !important;
}

/* =========================================================
   TABLET / MOBILE FINAL
========================================================= */
@media (max-width: 900px) {
  .aurora-menu-shell {
    width:min(760px,calc(100% - 22px)) !important;
  }

  .aurora-menu-layout {
    grid-template-columns:1fr !important;
  }

  .aurora-menu-sidebar {
    display:none !important;
  }

  .aurora-menu-featured-grid {
    grid-template-columns:repeat(2,minmax(0,1fr)) !important;
  }

  .aurora-menu-product-list {
    grid-template-columns:1fr !important;
  }
}

@media (max-width: 700px) {
  .aurora-menu-shell {
    width:100% !important;
  }

  .aurora-menu-header {
    min-height:63px !important;
    padding:0 11px !important;
  }

  .aurora-menu-hero {
    min-height:310px !important;
    border-radius:0 0 23px 23px !important;
  }

  .aurora-menu-hero-content {
    left:18px !important;
    right:18px !important;
    bottom:18px !important;
  }

  .aurora-menu-hero h1 {
    font-size:34px !important;
  }

  .aurora-menu-hero p {
    font-size:9px !important;
  }

  .aurora-menu-toolbar {
    margin-top:18px !important;
  }

  .aurora-menu-toolbar h2 {
    font-size:25px !important;
  }

  .aurora-menu-search,
  .aurora-menu-categories,
  .aurora-menu-section,
  .aurora-menu-footer {
    margin-left:11px !important;
    margin-right:11px !important;
  }

  .aurora-menu-featured-grid {
    grid-template-columns:repeat(2,minmax(0,1fr)) !important;
    gap:8px !important;
  }

  .aurora-menu-featured-card .customer-product {
    grid-template-rows:145px auto !important;
    min-height:240px !important;
  }

  .aurora-menu-featured-card .customer-product-image-wrap {
    height:145px !important;
    min-height:145px !important;
  }

  .aurora-menu-featured-card .customer-product-info h3 {
    font-size:10px !important;
  }

  .aurora-menu-featured-card .customer-product-info p {
    font-size:7px !important;
  }

  .aurora-menu-product-list {
    grid-template-columns:1fr !important;
    gap:8px !important;
  }

  .aurora-menu-product-card .customer-product {
    min-height:100px !important;
    grid-template-columns:86px minmax(0,1fr) !important;
    gap:9px !important;
    padding:7px !important;
  }

  .aurora-menu-product-card .customer-product-image-wrap {
    width:86px !important;
    height:86px !important;
    min-height:86px !important;
    border-radius:12px !important;
  }

  .aurora-menu-product-card .customer-product-info h3 {
    font-size:11px !important;
  }

  .aurora-menu-product-card .customer-product-info p {
    font-size:7px !important;
  }

  .aurora-menu-product-card .customer-product-price {
    font-size:12px !important;
  }

  .aurora-menu-product-card .add-to-cart-button {
    width:32px !important;
    height:32px !important;
    min-width:32px !important;
    min-height:32px !important;
  }

  .aurora-menu-bottom-nav {
    width:calc(100% - 18px) !important;
    bottom:7px !important;
  }
}

@media (max-width: 420px) {
  .aurora-menu-hero {
    min-height:290px !important;
  }

  .aurora-menu-hero h1 {
    font-size:31px !important;
  }

  .aurora-menu-featured-card .customer-product {
    grid-template-rows:130px auto !important;
    min-height:220px !important;
  }

  .aurora-menu-featured-card .customer-product-image-wrap {
    height:130px !important;
    min-height:130px !important;
  }

  .aurora-menu-category-scroll button {
    min-height:33px !important;
    padding:0 11px !important;
  }
}


/* =========================================================
   AURORA — ÜRÜN DETAY + SEPET FINAL PASS
   Yalnızca Aurora Menü içinde çalışır.
========================================================= */

/* ---------------------------------------------------------
   ÜRÜN KARTI
--------------------------------------------------------- */

.aurora-menu-page .aurora-menu-featured-card .customer-product,
.aurora-menu-page .aurora-menu-product-card .customer-product {
  position: relative !important;
  cursor: pointer !important;
}

.aurora-menu-page .aurora-menu-featured-card .customer-product-image-wrap,
.aurora-menu-page .aurora-menu-product-card .customer-product-image-wrap {
  overflow: hidden !important;
  background:
    linear-gradient(145deg,#1d1a16,#0f0f0e) !important;
}

.aurora-menu-page .aurora-menu-featured-card .customer-product-image,
.aurora-menu-page .aurora-menu-product-card .customer-product-image {
  width: 100% !important;
  height: 100% !important;
  display: block !important;
  object-fit: cover !important;
  transition: transform .28s ease, filter .28s ease !important;
}

.aurora-menu-page .aurora-menu-featured-card .customer-product:hover .customer-product-image,
.aurora-menu-page .aurora-menu-product-card .customer-product:hover .customer-product-image {
  transform: scale(1.045) !important;
  filter: brightness(.92) saturate(1.02) !important;
}

.aurora-menu-page .aurora-menu-featured-card .customer-product-info h3,
.aurora-menu-page .aurora-menu-product-card .customer-product-info h3 {
  letter-spacing: -.1px !important;
}

.aurora-menu-page .aurora-menu-featured-card .customer-product-price,
.aurora-menu-page .aurora-menu-product-card .customer-product-price {
  display: inline-block !important;
  padding: 4px 8px !important;
  border-radius: 999px !important;
  background: rgba(213,189,141,.08) !important;
  border: 1px solid rgba(213,189,141,.12) !important;
}

/* ---------------------------------------------------------
   ÜRÜN DETAY MODAL
--------------------------------------------------------- */

.aurora-menu-page .product-modal-overlay {
  position: fixed !important;
  inset: 0 !important;
  z-index: 999999 !important;

  display: flex !important;
  align-items: center !important;
  justify-content: center !important;

  padding: 18px !important;

  background:
    radial-gradient(
      circle at 50% 20%,
      rgba(168,116,54,.12),
      transparent 28%
    ),
    rgba(0,0,0,.80) !important;

  backdrop-filter: blur(10px) !important;
  -webkit-backdrop-filter: blur(10px) !important;
}

.aurora-menu-page .product-modal {
  position: relative !important;

  width: min(100%, 560px) !important;
  max-height: min(900px, calc(100dvh - 36px)) !important;

  margin: 0 !important;

  display: flex !important;
  flex-direction: column !important;

  overflow: hidden !important;

  border-radius: 28px !important;

  background:
    linear-gradient(
      145deg,
      #211d18 0%,
      #12110f 48%,
      #0d0d0c 100%
    ) !important;

  border:
    1px solid rgba(255,255,255,.13) !important;

  box-shadow:
    0 35px 120px rgba(0,0,0,.72),
    0 0 0 1px rgba(214,185,130,.03) !important;

  color: #f7f1e7 !important;
}

.aurora-menu-page .product-modal-image-area {
  position: relative !important;

  flex: 0 0 300px !important;

  height: 300px !important;
  min-height: 300px !important;

  overflow: hidden !important;

  background:
    radial-gradient(
      circle at 50% 40%,
      rgba(191,137,76,.18),
      transparent 50%
    ),
    #12100e !important;
}

.aurora-menu-page .product-modal-image-area::after {
  content: "";

  position: absolute;
  inset: 0;

  pointer-events: none;

  background:
    linear-gradient(
      180deg,
      transparent 55%,
      rgba(0,0,0,.55) 100%
    );
}

.aurora-menu-page .product-modal-image {
  width: 100% !important;
  height: 100% !important;

  display: block !important;

  object-fit: cover !important;

  filter:
    brightness(.88)
    saturate(.92)
    contrast(1.02) !important;
}

.aurora-menu-page .product-modal-no-image {
  width: 100% !important;
  height: 100% !important;

  display: grid !important;
  place-items: center !important;

  color: rgba(255,255,255,.32) !important;

  background:
    radial-gradient(
      circle,
      #29241e,
      #0f0e0c 70%
    ) !important;

  font-size: 44px !important;
}

.aurora-menu-page .product-modal-close {
  position: absolute !important;

  top: 12px !important;
  right: 12px !important;

  z-index: 20 !important;

  width: 42px !important;
  height: 42px !important;

  display: grid !important;
  place-items: center !important;

  padding: 0 !important;

  border-radius: 50% !important;

  border: 1px solid rgba(255,255,255,.12) !important;

  background:
    rgba(7,7,6,.62) !important;

  color: #fff !important;

  font-size: 26px !important;

  cursor: pointer !important;

  backdrop-filter: blur(10px) !important;
  -webkit-backdrop-filter: blur(10px) !important;
}

.aurora-menu-page .product-modal-content {
  min-height: 0 !important;

  flex: 1 1 auto !important;

  overflow-y: auto !important;
  overflow-x: hidden !important;

  padding:
    23px
    22px
    105px !important;

  -webkit-overflow-scrolling: touch !important;
}

.aurora-menu-page .product-modal-heading h2 {
  margin: 0 !important;

  padding-right: 38px !important;

  color: #fffaf2 !important;

  font:
    700 33px/1.02
    Georgia,
    "Times New Roman",
    serif !important;

  letter-spacing: -.45px !important;
}

.aurora-menu-page .product-modal-line {
  width: 120px !important;

  margin-top: 13px !important;

  display: flex !important;
  align-items: center !important;

  color: #d9bf8a !important;
}

.aurora-menu-page .product-modal-line::before,
.aurora-menu-page .product-modal-line::after {
  content: "";
  height: 1px;
  flex: 1;
  background: rgba(217,191,138,.28);
}

.aurora-menu-page .product-modal-line span {
  margin: 0 7px;
  font-size: 8px;
}

.aurora-menu-page .product-modal-price {
  margin-top: 15px !important;

  color: #dcc394 !important;

  font-size: 23px !important;
  line-height: 1 !important;

  font-weight: 950 !important;
}

.aurora-menu-page .product-modal-description {
  margin-top: 14px !important;

  color:
    rgba(255,255,255,.66) !important;

  font-size: 11px !important;

  line-height: 1.65 !important;
}

.aurora-menu-page .product-modal-info-box,
.aurora-menu-page .product-modal-allergen-box {
  margin-top: 12px !important;

  padding: 13px !important;

  border-radius: 15px !important;

  background:
    rgba(255,255,255,.045) !important;

  border:
    1px solid rgba(255,255,255,.08) !important;

  color:
    rgba(255,255,255,.68) !important;
}

.aurora-menu-page .product-modal-info-title {
  margin-bottom: 6px !important;

  color:
    #eee1ca !important;

  font-size: 9px !important;
  font-weight: 950 !important;
}

.aurora-menu-page .product-modal-info-box p,
.aurora-menu-page .product-modal-allergen-box p {
  margin: 0 !important;

  color:
    rgba(255,255,255,.56) !important;

  font-size: 9px !important;

  line-height: 1.55 !important;
}

.aurora-menu-page .product-modal-allergen-box {
  background:
    rgba(122,77,56,.10) !important;

  border-color:
    rgba(218,155,120,.12) !important;
}

.aurora-menu-page .product-modal-divider {
  margin: 18px 0 !important;

  border-top:
    1px dashed rgba(255,255,255,.13) !important;
}

.aurora-menu-page .quantity-title {
  margin-bottom: 8px !important;

  color:
    rgba(255,255,255,.54) !important;

  font-size: 9px !important;

  font-weight: 900 !important;

  letter-spacing: 1.4px !important;

  text-transform: uppercase !important;
}

.aurora-menu-page .quantity-selector {
  width: 100% !important;
  height: 55px !important;

  display: grid !important;

  grid-template-columns:
    54px
    1fr
    54px !important;

  align-items: center !important;

  border-radius: 28px !important;

  border:
    1px solid rgba(255,255,255,.09) !important;

  background:
    rgba(255,255,255,.035) !important;
}

.aurora-menu-page .quantity-selector button {
  width: 40px !important;
  height: 40px !important;

  margin: auto !important;

  display: grid !important;
  place-items: center !important;

  border-radius: 50% !important;

  border:
    1px solid rgba(216,193,147,.32) !important;

  background:
    rgba(255,255,255,.02) !important;

  color:
    #dbc08a !important;

  font-size: 20px !important;

  cursor: pointer !important;
}

.aurora-menu-page .quantity-selector strong {
  text-align: center !important;

  color: white !important;

  font-size: 19px !important;
}

.aurora-menu-page .product-modal-total {
  margin-top: 14px !important;

  padding: 14px 16px !important;

  display: flex !important;

  align-items: center !important;
  justify-content: space-between !important;

  border-radius: 15px !important;

  background:
    linear-gradient(
      135deg,
      #e8d09b,
      #b58d4d
    ) !important;

  border:
    1px solid rgba(255,231,185,.42) !important;

  color:
    #181209 !important;
}

.aurora-menu-page .product-modal-total span {
  font-size: 10px !important;
  font-weight: 900 !important;
}

.aurora-menu-page .product-modal-total strong {
  font-size: 20px !important;
  font-weight: 950 !important;
}

.aurora-menu-page .product-modal .product-modal-add {
  position: absolute !important;

  left: 18px !important;
  right: 18px !important;
  bottom: 14px !important;

  z-index: 30 !important;

  width:
    calc(100% - 36px) !important;

  height: 58px !important;
  min-height: 58px !important;

  margin: 0 !important;

  display: flex !important;

  align-items: center !important;
  justify-content: center !important;

  gap: 8px !important;

  border-radius: 17px !important;

  border:
    1px solid rgba(255,229,169,.52) !important;

  background:
    linear-gradient(
      135deg,
      #e7cc91,
      #b48948
    ) !important;

  color:
    #171008 !important;

  font-size: 14px !important;

  font-weight: 950 !important;

  box-shadow:
    0 14px 35px rgba(0,0,0,.34) !important;

  cursor: pointer !important;
}

.aurora-menu-page .product-modal .product-modal-add span {
  color: inherit !important;
  font-size: 16px !important;
}

/* ---------------------------------------------------------
   SEPET SHEET
--------------------------------------------------------- */

.aurora-menu-page .aurora-menu-overlay {
  z-index: 99990 !important;

  align-items: flex-end !important;

  padding:
    12px !important;

  background:
    rgba(0,0,0,.78) !important;

  backdrop-filter: blur(10px) !important;
  -webkit-backdrop-filter: blur(10px) !important;
}

.aurora-menu-page .aurora-menu-sheet {
  width:
    min(100%, 590px) !important;

  max-height:
    min(88dvh, 820px) !important;

  padding:
    8px
    17px
    18px !important;

  border-radius:
    27px
    27px
    20px
    20px !important;

  border:
    1px solid rgba(255,255,255,.13) !important;

  background:
    linear-gradient(
      145deg,
      #211d18,
      #0e0e0d
    ) !important;

  box-shadow:
    0 35px 100px rgba(0,0,0,.67) !important;
}

.aurora-menu-page .aurora-menu-sheet-handle {
  width: 43px !important;
  height: 4px !important;

  margin:
    2px
    auto
    15px !important;

  border-radius: 99px !important;

  background:
    rgba(255,255,255,.18) !important;
}

.aurora-menu-page .aurora-menu-sheet-header {
  padding-bottom: 15px !important;

  border-bottom:
    1px solid rgba(255,255,255,.08) !important;
}

.aurora-menu-page .aurora-menu-sheet-header h2 {
  font-size: 28px !important;
}

.aurora-menu-page .aurora-menu-sheet-header > button {
  width: 38px !important;
  height: 38px !important;

  background:
    rgba(255,255,255,.055) !important;

  border-color:
    rgba(255,255,255,.10) !important;
}

.aurora-menu-page .aurora-menu-cart-list {
  gap: 9px !important;
  margin-top: 14px !important;
}

.aurora-menu-page .aurora-menu-cart-item {
  grid-template-columns:
    70px
    minmax(0,1fr)
    auto !important;

  padding: 7px !important;

  border-radius: 17px !important;

  background:
    rgba(255,255,255,.045) !important;

  border-color:
    rgba(255,255,255,.075) !important;
}

.aurora-menu-page .aurora-menu-cart-image,
.aurora-menu-page .aurora-menu-cart-image img {
  width: 70px !important;
  height: 70px !important;
  border-radius: 13px !important;
}

.aurora-menu-page .aurora-menu-cart-info > strong {
  font-size: 10px !important;
}

.aurora-menu-page .aurora-menu-cart-info > span {
  margin-top: 4px !important;

  color:
    #d8be8d !important;

  font-size: 9px !important;
}

.aurora-menu-page .aurora-menu-cart-qty {
  margin-top: 7px !important;
}

.aurora-menu-page .aurora-menu-cart-qty button {
  min-width: 28px !important;
  height: 28px !important;

  border-radius: 9px !important;

  background:
    rgba(255,255,255,.045) !important;

  border-color:
    rgba(255,255,255,.09) !important;
}

.aurora-menu-page .aurora-menu-cart-qty b {
  font-size: 9px !important;
}

.aurora-menu-page .aurora-menu-cart-qty .remove {
  color:
    #dcae9f !important;
}

.aurora-menu-page .aurora-menu-cart-total {
  color: white !important;
  font-size: 10px !important;
}

.aurora-menu-page .aurora-menu-grand-total {
  margin-top: 16px !important;

  padding:
    15px
    2px !important;

  border-top:
    1px solid rgba(255,255,255,.09) !important;
}

.aurora-menu-page .aurora-menu-grand-total span {
  color:
    rgba(255,255,255,.48) !important;
}

.aurora-menu-page .aurora-menu-grand-total strong {
  color: #f2e7d3 !important;

  font-size: 19px !important;
}

.aurora-menu-page .aurora-menu-primary-button {
  min-height: 57px !important;

  border-radius: 16px !important;

  background:
    linear-gradient(
      135deg,
      #e7cd95,
      #b18a4c
    ) !important;

  border-color:
    rgba(255,227,175,.36) !important;

  color:
    #171008 !important;

  font-size: 13px !important;
}

/* ---------------------------------------------------------
   MOBİL ÜRÜN MODAL + SEPET
--------------------------------------------------------- */

@media (max-width: 700px) {
  .aurora-menu-page .product-modal-overlay {
    padding: 8px !important;
  }

  .aurora-menu-page .product-modal {
    width: 100% !important;

    max-height:
      calc(100dvh - 16px) !important;

    border-radius: 22px !important;
  }

  .aurora-menu-page .product-modal-image-area {
    flex-basis: 205px !important;

    height: 205px !important;
    min-height: 205px !important;
  }

  .aurora-menu-page .product-modal-content {
    padding:
      18px
      16px
      92px !important;
  }

  .aurora-menu-page .product-modal-heading h2 {
    font-size: 27px !important;
  }

  .aurora-menu-page .product-modal-price {
    font-size: 21px !important;
  }

  .aurora-menu-page .product-modal-description {
    font-size: 10px !important;
  }

  .aurora-menu-page .aurora-menu-overlay {
    padding: 7px !important;
  }

  .aurora-menu-page .aurora-menu-sheet {
    max-height:
      calc(100dvh - 14px) !important;

    padding:
      7px
      13px
      15px !important;
  }

  .aurora-menu-page .aurora-menu-cart-item {
    grid-template-columns:
      60px
      minmax(0,1fr)
      auto !important;
  }

  .aurora-menu-page .aurora-menu-cart-image,
  .aurora-menu-page .aurora-menu-cart-image img {
    width: 60px !important;
    height: 60px !important;
  }

  .aurora-menu-page .aurora-menu-cart-total {
    display: none !important;
  }
}

@media (max-width: 420px) {
  .aurora-menu-page .product-modal-image-area {
    flex-basis: 185px !important;
    height: 185px !important;
    min-height: 185px !important;
  }

  .aurora-menu-page .product-modal-heading h2 {
    font-size: 25px !important;
  }

  .aurora-menu-page .product-modal-content {
    padding:
      16px
      14px
      90px !important;
  }

  .aurora-menu-page .product-modal .product-modal-add {
    left: 14px !important;
    right: 14px !important;
    width: calc(100% - 28px) !important;
  }
}

`;
