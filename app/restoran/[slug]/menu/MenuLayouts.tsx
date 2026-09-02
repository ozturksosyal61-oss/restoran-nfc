
"use client";

import { useState } from "react";
import ProductCard from "./ProductCard";
import { useCart } from "./CartContext";

type Product = {
  id: number;
  category_id: number;
  name: string;
  description: string | null;
  ingredients: string | null;
  allergens: string | null;
  price: number;
  image_url: string | null;
};

type Category = {
  id: number;
  name: string;
};

type MenuLayoutsProps = {
  categories: Category[];
  products: Product[];
  layout?: "classic" | "editorial" | "grid" | "ivory" | "ozt-glass-premium";
  showCart?: boolean;
  restaurantName?: string;
  tableNumber?: number | null;
  slug?: string;
  masa?: string;
  garson?: string;
  waiterAction?: (formData: FormData) => void | Promise<void>;
  logoUrl?: string | null;
  coverImageUrl?: string | null;
};

/* =========================================================
   YARDIMCI
========================================================= */

function getCategoryProducts(
  categoryId: number,
  products: Product[]
) {
  return products.filter(
    (product) =>
      Number(product.category_id) === Number(categoryId)
  );
}

function ProductItem({
  product,
}: {
  product: Product;
}) {
  return (
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
  );
}

function EmptyCategory() {
  return (
    <div className="ozt-empty-category">
      <div className="ozt-empty-icon">🍽️</div>
      <div>Bu kategoride şu anda ürün bulunmuyor.</div>
    </div>
  );
}

/* =========================================================
   CLASSIC
   Geleneksel / temiz restoran menüsü
========================================================= */

function ClassicLayout({
  categories,
  products,
}: MenuLayoutsProps) {
  return (
    <div className="ozt-layout ozt-layout-classic">
      {categories.map((category) => {
        const categoryProducts = getCategoryProducts(
          category.id,
          products
        );

        return (
          <section
            key={category.id}
            id={`category-${category.id}`}
            className="ozt-classic-section"
          >
            <div className="ozt-classic-category-header">
              <div className="ozt-classic-title-wrap">
                <div className="ozt-classic-accent" />

                <div>
                  <h2>{category.name}</h2>

                  <span>
                    {categoryProducts.length} ürün
                  </span>
                </div>
              </div>

              <div className="ozt-classic-number">
                {String(categoryProducts.length).padStart(2, "0")}
              </div>
            </div>

            {categoryProducts.length === 0 ? (
              <EmptyCategory />
            ) : (
              <div className="ozt-classic-products">
                {categoryProducts.map((product) => (
                  <div
                    key={product.id}
                    className="ozt-classic-product-wrapper"
                  >
                    <ProductItem product={product} />
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

/* =========================================================
   EDITORIAL
   Dergi / premium restoran
========================================================= */

function EditorialLayout({
  categories,
  products,
}: MenuLayoutsProps) {
  return (
    <div className="ozt-layout ozt-layout-editorial">
      {categories.map((category) => {
        const categoryProducts = getCategoryProducts(
          category.id,
          products
        );

        return (
          <section
            key={category.id}
            id={`category-${category.id}`}
            className="ozt-editorial-section"
          >
            {/* KATEGORİ BAŞLIĞI */}

            <div className="ozt-editorial-heading">
              <div className="ozt-editorial-small">
                OZT MENU
              </div>

              <div className="ozt-editorial-heading-row">
                <h2>{category.name}</h2>

                <span>
                  {String(categoryProducts.length).padStart(
                    2,
                    "0"
                  )}
                </span>
              </div>

              <div className="ozt-editorial-line">
                <div />
              </div>
            </div>

            {/* ÜRÜNLER */}

            {categoryProducts.length === 0 ? (
              <EmptyCategory />
            ) : (
              <div className="ozt-editorial-products">
                {categoryProducts.map((product, index) => (
                  <article
                    key={product.id}
                    className={
                      index === 0
                        ? "ozt-editorial-feature"
                        : "ozt-editorial-standard"
                    }
                  >
                    <ProductItem product={product} />
                  </article>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

/* =========================================================
   GRID
   Modern / Cafe / Burger / Fast Food
========================================================= */

function GridLayout({
  categories,
  products,
}: MenuLayoutsProps) {
  return (
    <div className="ozt-layout ozt-layout-grid">
      {categories.map((category) => {
        const categoryProducts = getCategoryProducts(
          category.id,
          products
        );

        return (
          <section
            key={category.id}
            id={`category-${category.id}`}
            className="ozt-grid-section"
          >
            <div className="ozt-grid-heading">
              <div>
                <span>MENÜ</span>
                <h2>{category.name}</h2>
              </div>

              <strong>
                {categoryProducts.length}
              </strong>
            </div>

            {categoryProducts.length === 0 ? (
              <EmptyCategory />
            ) : (
              <div className="ozt-grid-products">
                {categoryProducts.map((product) => (
                  <article
                    key={product.id}
                    className="ozt-grid-card"
                  >
                    <ProductItem product={product} />
                  </article>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}



/* =========================================================
   IVORY / LUXURY 3D
   Açık / premium / 3D-neumorphic restoran menüsü
========================================================= */

function IvoryLuxury3DLayout({
  categories,
  products,
}: MenuLayoutsProps) {
  return (
    <div className="ozt-layout ozt-layout-ivory-3d">
      <div className="ozt-ivory-hero">
        <div className="ozt-ivory-orb" />
        <div className="ozt-ivory-kicker">OZT DIGITAL MENU</div>
        <div className="ozt-ivory-title">Lezzeti Keşfet</div>
        <div className="ozt-ivory-subtitle">Premium menü deneyimi</div>
      </div>

      {categories.map((category) => {
        const categoryProducts = getCategoryProducts(
          category.id,
          products
        );

        return (
          <section
            key={category.id}
            id={`category-${category.id}`}
            className="ozt-ivory-section"
          >
            <div className="ozt-ivory-heading">
              <div>
                <span>KATEGORİ</span>
                <h2>{category.name}</h2>
              </div>
              <div className="ozt-ivory-count">
                {String(categoryProducts.length).padStart(2, "0")}
              </div>
            </div>

            {categoryProducts.length === 0 ? (
              <EmptyCategory />
            ) : (
              <div className="ozt-ivory-products">
                {categoryProducts.map((product, index) => (
                  <article
                    key={product.id}
                    className={
                      index === 0
                        ? "ozt-ivory-card ozt-ivory-card-feature"
                        : "ozt-ivory-card"
                    }
                  >
                    <ProductItem product={product} />
                  </article>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}


/* =========================================================
   OZT GLASS PREMIUM
   Cam / blur / soft 3D / premium modern restoran menüsü
========================================================= */

function OztGlassPremiumLayout({
  categories,
  products,
  restaurantName = "Restoran",
  tableNumber = null,
  slug = "",
  masa = "",
  garson = "",
  waiterAction,
  logoUrl = null,
  coverImageUrl = null,
}: MenuLayoutsProps) {
  const {
    items,
    itemCount,
    total,
    addToCart,
    increaseQuantity,
    decreaseQuantity,
    removeFromCart,
  } = useCart();
  const [searchTerm, setSearchTerm] = useState("");

const normalizedSearch = searchTerm
  .trim()
  .toLocaleLowerCase("tr-TR");

const filteredProducts = normalizedSearch
  ? products.filter((product) => {
      const searchableText = [
        product.name,
        product.description,
        product.ingredients,
        product.allergens,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("tr-TR");

      return searchableText.includes(normalizedSearch);
    })
  : products;

  /*
   * Premium tema için sadece ürün bulunan kategorileri kullan.
   * Böylece boş kategori başlıkları/kartları oluşmaz.
   * Aynı isimli kategori kalmış olsa bile tekilleştirilir.
   */
  const premiumCategories = categories.filter(
    (category, index, array) =>
      getCategoryProducts(category.id, products).length > 0 &&
      array.findIndex(
        (candidate) =>
          candidate.name.trim().toLocaleLowerCase("tr-TR") ===
          category.name.trim().toLocaleLowerCase("tr-TR")
      ) === index
  );

  const visibleCategories = premiumCategories.filter((category) =>
    getCategoryProducts(category.id, filteredProducts).length > 0
  );

  const featuredNames = new Set([
    "Truffle Alfredo",
    "Mira Smash Burger",
    "San Sebastian",
    "Mojito",
  ]);

  const featuredProducts: Product[] = [];

  for (const product of products) {
    if (
      featuredNames.has(product.name) &&
      !featuredProducts.some(
        (featured) => featured.id === product.id
      )
    ) {
      featuredProducts.push(product);
    }
  }

  if (featuredProducts.length < 4) {
    for (const product of products) {
      if (
        !featuredProducts.some(
          (featured) => featured.id === product.id
        )
      ) {
        featuredProducts.push(product);
      }

      if (featuredProducts.length === 4) {
        break;
      }
    }
  }

  const firstCategoryId = premiumCategories[0]?.id;

  function categoryImage(categoryId: number) {
    return (
      products.find(
        (product) =>
          Number(product.category_id) === Number(categoryId)
      )?.image_url || null
    );
  }

  return (
    <div id="ozt-premium-top" className="ozt-layout ozt-layout-glass-premium">
      <header className="ozt-app-header">
        <div className="ozt-app-brand">
          <div className="ozt-app-logo">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={`${restaurantName} logosu`}
                className="ozt-app-logo-image"
              />
            ) : (
              restaurantName
                .trim()
                .slice(0, 3)
                .toUpperCase()
            )}
          </div>
          <div>
            <strong>{restaurantName}</strong>
            <span>PREMIUM MENU EXPERIENCE</span>
          </div>
        </div>
        <a href="#ozt-premium-cart" className="ozt-app-header-cart" aria-label="Sepeti görüntüle">
          <span>🛒</span>
          {itemCount > 0 ? <b>{itemCount}</b> : null}
        </a>
        {tableNumber ? <div className="ozt-app-table">🪑 Masa {tableNumber}</div> : null}
      </header>

      <section className="ozt-glass-hero ozt-app-hero">
        <div
          className="ozt-app-hero-photo"
          style={
            coverImageUrl
              ? {
                  backgroundImage: `url("${coverImageUrl}")`,
                }
              : undefined
          }
        />
        <div className="ozt-app-hero-overlay" />
        <div className="ozt-app-hero-content">
          <div className="ozt-glass-eyebrow">{restaurantName.toUpperCase()}</div>
          <div className="ozt-glass-hero-title">Hoş Geldiniz ♥</div>
          <div className="ozt-glass-hero-copy">Lezzet, şimdi bir tık uzağınızda. Menünüzü keşfedin ve favorinizi seçin.</div>
          <div
  className={`ozt-app-search ${
    normalizedSearch ? "has-search" : ""
  }`}
>
  <span className="ozt-app-search-icon">⌕</span>

  <input
    type="search"
    value={searchTerm}
    onChange={(event) => setSearchTerm(event.target.value)}
    placeholder="Menüde ara..."
    aria-label="Menüde ara"
    autoComplete="off"
  />

  {searchTerm && (
    <button
      type="button"
      className="ozt-app-search-clear"
      onClick={() => setSearchTerm("")}
      aria-label="Aramayı temizle"
    >
      ×
    </button>
  )}
</div>
        </div>
      </section>

      {visibleCategories.length > 0 && (
        <div className="ozt-app-category-strip">
          <div className="ozt-app-categories" aria-label="Kategoriler">
          {visibleCategories.map((category) => {
            const img = categoryImage(category.id);
            return (
              <a key={category.id} href={`#category-${category.id}`} className="ozt-app-category">
                <div className="ozt-app-category-image">
                  {img ? <img src={img} alt="" /> : <span>🍽️</span>}
                </div>
                <span>{category.name}</span>
              </a>
            );
          })}
          </div>
        </div>
      )}

      {tableNumber && waiterAction && (
        <section className="ozt-app-quick-actions">
          <form action={waiterAction}>
            <input type="hidden" name="slug" value={slug} />
            <input type="hidden" name="masa" value={masa} />
            <button type="submit" className="ozt-app-action-button">
              <span>♙</span>
              <strong>Garsonu Çağır</strong>
              <small>{garson === "ok" ? "Çağrı gönderildi" : garson === "hata" ? "Tekrar deneyin" : `Masa ${tableNumber}`}</small>
            </button>
          </form>
          <a href={firstCategoryId ? `#category-${firstCategoryId}` : "#ozt-premium-top"} className="ozt-app-action-button">
            <span>⌑</span>
            <strong>Menü Ürünleri</strong>
            <small>{products.length} ürün</small>
          </a>
          <a href="#ozt-premium-cart" className="ozt-app-action-button">
            <span>🛒</span>
            <strong>Sepet</strong>
            <small>{itemCount} ürün · {total.toLocaleString("tr-TR")} TL</small>
          </a>
        </section>
      )}

      {!tableNumber && (
        <section className="ozt-app-quick-actions">
          <a href={firstCategoryId ? `#category-${firstCategoryId}` : "#ozt-premium-top"} className="ozt-app-action-button">
            <span>⌑</span><strong>Menü Ürünleri</strong><small>{products.length} ürün</small>
          </a>
          <a href="#ozt-premium-cart" className="ozt-app-action-button">
            <span>🛒</span><strong>Sepet</strong><small>{itemCount} ürün</small>
          </a>
        </section>
      )}

      {garson === "ok" && <div className="ozt-app-message success">✓ Garson çağrınız gönderildi.</div>}
      {garson === "hata" && <div className="ozt-app-message error">Garson çağrısı gönderilemedi. Lütfen tekrar deneyin.</div>}

      {!normalizedSearch && featuredProducts.length > 0 && (
        <section className="ozt-app-section">
          <div className="ozt-app-section-heading">
            <div><span>ÖNE ÇIKANLAR 🔥</span><h2>Favoriler</h2></div>
            <small>{featuredProducts.length} seçki</small>
          </div>
          <div className="ozt-app-featured-row">
            {featuredProducts.map((product) => (
              <article key={product.id} className="ozt-app-feature-card">
                <ProductItem product={product} />
                <button
                  type="button"
                  className="ozt-app-quick-add"
                  onClick={(event) => {
                    event.stopPropagation();
                    addToCart({ id: product.id, name: product.name, price: Number(product.price), image_url: product.image_url, quantity: 1 });
                  }}
                >＋</button>
              </article>
            ))}
          </div>
        </section>
      )}
      {normalizedSearch && filteredProducts.length === 0 && (
  <section className="ozt-app-search-empty">
    <div className="ozt-app-search-empty-icon">⌕</div>

    <h3>Ürün bulunamadı</h3>

    <p>
      “{searchTerm}” için menümüzde eşleşen bir ürün
      bulunamadı.
    </p>

    <button
      type="button"
      onClick={() => setSearchTerm("")}
    >
      Aramayı Temizle
    </button>
  </section>
)}
{visibleCategories.map((category) => {
  const categoryProducts = getCategoryProducts(
    category.id,
    filteredProducts
  );
        return (
          <section key={category.id} id={`category-${category.id}`} className="ozt-app-section">
            <div className="ozt-glass-section-heading">
              <div>
                <div className="ozt-glass-section-kicker">MENÜ</div>
                <h2>{category.name}</h2>
                <p>{categoryProducts.length} ürün</p>
              </div>
              <div className="ozt-glass-section-badge">{String(categoryProducts.length).padStart(2, "0")}</div>
            </div>
            {categoryProducts.length === 0 ? <EmptyCategory /> : (
              <div className="ozt-app-product-list">
                {categoryProducts.map((product) => (
                  <article key={product.id} className="ozt-app-product-row">
                    <ProductItem product={product} />
                    <button
                      type="button"
                      className="ozt-app-quick-add ozt-app-row-add"
                      onClick={(event) => {
                        event.stopPropagation();
                        addToCart({ id: product.id, name: product.name, price: Number(product.price), image_url: product.image_url, quantity: 1 });
                      }}
                    >＋</button>
                  </article>
                ))}
              </div>
            )}
          </section>
        );
      })}

      <nav className="ozt-app-bottom-nav" aria-label="Menü kısayolları">
        <a href="#ozt-premium-top" className="active"><span>⌂</span>Menü</a>
        <a href="#ozt-premium-cart"><span>🛒</span>Sepet{itemCount > 0 ? ` (${itemCount})` : ""}</a>
      </nav>

      <section id="ozt-premium-cart" className={`ozt-app-cart-panel${items.length === 0 ? " is-empty" : ""}`}>
        <div className="ozt-app-section-heading">
          <div><span>SEPET</span><h2>{items.length > 0 ? "Siparişiniz" : "Sepetiniz"}</h2></div>
          <strong>{itemCount > 0 ? `${itemCount} ürün` : "Boş"}</strong>
        </div>

        {items.length === 0 ? (
          <div className="ozt-app-cart-empty">
            <div className="ozt-app-cart-empty-icon">🛒</div>
            <strong>Sepetiniz şu anda boş</strong>
            <span>Favori ürünlerinizi ekleyin, siparişinizi buradan tamamlayın.</span>
            <a href={firstCategoryId ? `#category-${firstCategoryId}` : "#ozt-premium-top"}>Menüye Dön →</a>
          </div>
        ) : (
          <>
            <div className="ozt-app-cart-items">
              {items.map((item) => (
                <div key={item.id} className="ozt-app-cart-item">
                  {item.image_url ? <img src={item.image_url} alt="" /> : <div className="ozt-app-cart-placeholder">🍽️</div>}
                  <div className="ozt-app-cart-info">
                    <strong>{item.name}</strong>
                    <span>{Number(item.price).toLocaleString("tr-TR")} TL</span>
                  </div>
                  <div className="ozt-app-cart-controls">
                    <button type="button" onClick={() => decreaseQuantity(item.id)}>−</button>
                    <b>{item.quantity}</b>
                    <button type="button" onClick={() => increaseQuantity(item.id)}>+</button>
                  </div>
                  <button type="button" className="ozt-app-cart-remove" onClick={() => removeFromCart(item.id)}>×</button>
                </div>
              ))}
            </div>
            <div className="ozt-app-cart-total"><span>Toplam</span><strong>{total.toLocaleString("tr-TR")} TL</strong></div>
            <a
              className="ozt-app-order-button"
              href={slug ? `/restoran/${slug}/siparis${masa ? `?masa=${encodeURIComponent(masa)}` : ""}` : "#"}
            >Siparişi Tamamla · {total.toLocaleString("tr-TR")} TL</a>
          </>
        )}
      </section>

      <footer className="ozt-app-footer">OZT DIGITAL · PREMIUM MENU</footer>
    </div>
  );
}

/* =========================================================
   MAIN
========================================================= */

export default function MenuLayouts({
  categories,
  products,
  layout = "classic",
  showCart = false,
  restaurantName,
  tableNumber,
  slug,
  masa,
  garson,
  waiterAction,
}: MenuLayoutsProps) {
  return (
    <>
      <style>{`

        /* =====================================================
           ORTAK
        ===================================================== */

        .ozt-layout {
          width: 100%;
          max-width: 760px;
          margin: 0 auto;
          padding: 0 18px;
          box-sizing: border-box;
        }

        .ozt-layout *,
        .ozt-layout *::before,
        .ozt-layout *::after {
          box-sizing: border-box;
        }

        .ozt-empty-category {
          padding: 32px 20px;
          border: 1px solid #ded8ce;
          border-radius: 18px;
          background: #fff;
          color: #777 !important;
          text-align: center;
          font-size: 13px;
        }

        .ozt-empty-icon {
          margin-bottom: 8px;
          font-size: 28px;
        }

        /* =====================================================
           CLASSIC
        ===================================================== */

        .ozt-layout-classic {
          padding-top: 4px;
        }

        .ozt-classic-section {
          margin-bottom: 42px;
          scroll-margin-top: 90px;
        }

        .ozt-classic-category-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 18px;
        }

        .ozt-classic-title-wrap {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .ozt-classic-accent {
          width: 5px;
          height: 34px;
          border-radius: 999px;
          background: #d4a017;
        }

        .ozt-classic-category-header h2 {
          margin: 0 !important;
          color: #171717 !important;
          font-size: 24px !important;
          line-height: 1.05 !important;
          font-weight: 900 !important;
        }

        .ozt-classic-title-wrap span {
          display: block;
          margin-top: 4px;
          color: #999 !important;
          font-size: 11px !important;
        }

        .ozt-classic-number {
          color: #b88927 !important;
          font-size: 12px !important;
          font-weight: 900 !important;
        }

        .ozt-classic-products {
          display: flex;
          flex-direction: column;
          gap: 13px;
        }

        .ozt-classic-product-wrapper {
          width: 100%;
        }

        /*
         * Classic'in kendi kart yapısı
         */

        .ozt-classic-product-wrapper .customer-product {
          display: grid !important;
          grid-template-columns: 125px minmax(0, 1fr) 50px !important;
          align-items: center !important;
          gap: 16px !important;

          width: 100% !important;
          min-height: 125px !important;

          padding: 10px !important;

          background: #fff !important;
          border: 1px solid #e5e0d8 !important;
          border-radius: 18px !important;

          box-shadow:
            0 6px 20px rgba(0,0,0,0.05) !important;

          overflow: hidden !important;
        }

        .ozt-classic-product-wrapper
        .customer-product-image-wrap {
          width: 125px !important;
          height: 105px !important;

          border-radius: 12px !important;
          overflow: hidden !important;

          background: #f4f1eb !important;
        }

        .ozt-classic-product-wrapper
        .customer-product-image {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
          display: block !important;
        }

        .ozt-classic-product-wrapper
        .customer-product-info {
          min-width: 0 !important;
          padding: 4px 0 !important;
        }

        .ozt-classic-product-wrapper
        .customer-product-info h3 {
          margin: 0 0 7px !important;
          color: #171717 !important;
          font-size: 16px !important;
          font-weight: 900 !important;
        }

        .ozt-classic-product-wrapper
        .customer-product-info p {
          margin: 0 0 10px !important;
          color: #777 !important;
          font-size: 11px !important;
          line-height: 1.45 !important;

          display: -webkit-box !important;
          -webkit-box-orient: vertical !important;
          -webkit-line-clamp: 2 !important;
          overflow: hidden !important;
        }

        .ozt-classic-product-wrapper
        .customer-product-price {
          color: #b88927 !important;
          font-size: 16px !important;
          font-weight: 950 !important;
        }

        .ozt-classic-product-wrapper
        .customer-product-right {
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }

        .ozt-classic-product-wrapper
        .add-to-cart-button {
          width: 42px !important;
          height: 42px !important;

          border: 0 !important;
          border-radius: 50% !important;

          background: #181818 !important;
          color: #fff !important;

          cursor: pointer !important;
        }

        .ozt-classic-product-wrapper
        .add-to-cart-button span {
          font-size: 23px !important;
        }

        /* =====================================================
           EDITORIAL
        ===================================================== */

        .ozt-layout-editorial {
          max-width: 700px;
          padding-left: 22px;
          padding-right: 22px;

          background: #f5f0e7;
          color: #171717;
        }

        .ozt-editorial-section {
          margin-bottom: 58px;
          scroll-margin-top: 90px;
        }

        .ozt-editorial-heading {
          padding-top: 10px;
          margin-bottom: 22px;
        }

        .ozt-editorial-small {
          margin-bottom: 7px;
          color: #a27a2a !important;
          font-size: 9px !important;
          font-weight: 900 !important;
          letter-spacing: 4px !important;
        }

        .ozt-editorial-heading-row {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 15px;
        }

        .ozt-editorial-heading-row h2 {
          margin: 0 !important;
          color: #171717 !important;
          font-family: Georgia, "Times New Roman", serif !important;
          font-size: 34px !important;
          line-height: 1 !important;
          font-weight: 500 !important;
          letter-spacing: -1px !important;
        }

        .ozt-editorial-heading-row span {
          color: #a27a2a !important;
          font-size: 12px !important;
          font-weight: 800 !important;
        }

        .ozt-editorial-line {
          position: relative;
          width: 100%;
          height: 1px;
          margin-top: 13px;
          background: #cfc3ae;
        }

        .ozt-editorial-line div {
          width: 62px;
          height: 3px;
          margin-top: -1px;
          background: #a27a2a;
        }

        .ozt-editorial-products {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        /*
         * EDITORIAL FEATURE
         * İlk ürün büyük dergi kartı
         */

        .ozt-editorial-feature
        .customer-product {
          position: relative !important;

          display: flex !important;
          flex-direction: column !important;
          align-items: stretch !important;

          width: 100% !important;

          padding: 0 !important;

          background: #fff !important;
          border: 0 !important;
          border-radius: 0 !important;

          overflow: hidden !important;

          box-shadow:
            0 8px 25px rgba(52,43,28,0.10) !important;
        }

        .ozt-editorial-feature
        .customer-product-image-wrap {
          width: 100% !important;
          height: 300px !important;

          border-radius: 0 !important;
          overflow: hidden !important;
          background: #e9e2d7 !important;
        }

        .ozt-editorial-feature
        .customer-product-image {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
          display: block !important;
        }

        .ozt-editorial-feature
        .customer-product-info {
          padding: 18px 20px 7px !important;
        }

        .ozt-editorial-feature
        .customer-product-info h3 {
          margin: 0 0 8px !important;
          color: #171717 !important;
          font-family: Georgia, "Times New Roman", serif !important;
          font-size: 25px !important;
          font-weight: 600 !important;
        }

        .ozt-editorial-feature
        .customer-product-info p {
          margin: 0 0 12px !important;
          color: #777 !important;
          font-size: 12px !important;
          line-height: 1.55 !important;
        }

        .ozt-editorial-feature
        .customer-product-price {
          display: block !important;
          padding: 0 20px 18px !important;

          color: #a27a2a !important;
          font-size: 18px !important;
          font-weight: 900 !important;
        }

        .ozt-editorial-feature
        .customer-product-right {
          position: absolute !important;
          right: 17px !important;
          bottom: 17px !important;
          z-index: 5 !important;
        }

        .ozt-editorial-feature
        .add-to-cart-button {
          width: 48px !important;
          height: 48px !important;

          border: 0 !important;
          border-radius: 50% !important;

          background: #b88927 !important;
          color: #fff !important;
        }

        .ozt-editorial-feature
        .add-to-cart-button span {
          font-size: 25px !important;
        }

        /*
         * EDITORIAL STANDARD
         * Diğer ürünler dergi içi yatay kart
         */

        .ozt-editorial-standard
        .customer-product {
          position: relative !important;

          display: grid !important;
          grid-template-columns:
            190px minmax(0, 1fr) 42px !important;

          align-items: center !important;
          gap: 17px !important;

          width: 100% !important;
          min-height: 150px !important;

          padding: 0 !important;

          background: #fff !important;
          border: 0 !important;
          border-radius: 0 !important;

          overflow: hidden !important;

          box-shadow:
            0 6px 18px rgba(52,43,28,0.07) !important;
        }

        .ozt-editorial-standard
        .customer-product-image-wrap {
          width: 190px !important;
          height: 150px !important;

          border-radius: 0 !important;
          overflow: hidden !important;
          background: #e9e2d7 !important;
        }

        .ozt-editorial-standard
        .customer-product-image {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
          display: block !important;
        }

        .ozt-editorial-standard
        .customer-product-info {
          min-width: 0 !important;
          padding: 15px 0 !important;
        }

        .ozt-editorial-standard
        .customer-product-info h3 {
          margin: 0 0 6px !important;
          color: #171717 !important;
          font-family: Georgia, "Times New Roman", serif !important;
          font-size: 19px !important;
          font-weight: 600 !important;
        }

        .ozt-editorial-standard
        .customer-product-info p {
          margin: 0 0 10px !important;
          color: #777 !important;
          font-size: 10px !important;
          line-height: 1.45 !important;
        }

        .ozt-editorial-standard
        .customer-product-price {
          color: #a27a2a !important;
          font-size: 15px !important;
          font-weight: 900 !important;
        }

        .ozt-editorial-standard
        .customer-product-right {
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }

        .ozt-editorial-standard
        .add-to-cart-button {
          width: 38px !important;
          height: 38px !important;
          border: 0 !important;
          border-radius: 50% !important;
          background: #171717 !important;
          color: #fff !important;
        }

        /* =====================================================
           GRID
        ===================================================== */

        .ozt-layout-grid {
          max-width: 760px;
        }

        .ozt-grid-section {
          margin-bottom: 48px;
          scroll-margin-top: 90px;
        }

        .ozt-grid-heading {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          margin-bottom: 17px;
        }

        .ozt-grid-heading span {
          display: block;
          margin-bottom: 6px;
          color: #d4a017 !important;
          font-size: 8px !important;
          font-weight: 900 !important;
          letter-spacing: 3px !important;
        }

        .ozt-grid-heading h2 {
          margin: 0 !important;
          color: #f4efe5 !important;
          font-size: 27px !important;
          line-height: 1 !important;
          font-weight: 950 !important;
        }

        .ozt-grid-heading strong {
          color: #d4a017 !important;
          font-size: 12px !important;
        }

        .ozt-grid-products {
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
          gap: 15px;
        }

        .ozt-grid-card {
          min-width: 0;
        }

        /*
         * GRID = TAMAMEN KART ODAKLI
         */

        .ozt-grid-card
        .customer-product {
          position: relative !important;

          display: flex !important;
          flex-direction: column !important;
          align-items: stretch !important;

          width: 100% !important;
          height: 100% !important;

          padding: 0 !important;

          background: #fff !important;
          border: 1px solid #ddd7cc !important;
          border-radius: 20px !important;

          overflow: hidden !important;

          box-shadow:
            0 8px 24px rgba(0,0,0,0.08) !important;
        }

        .ozt-grid-card
        .customer-product-image-wrap {
          width: 100% !important;
          height: 190px !important;

          border-radius: 0 !important;
          overflow: hidden !important;

          background: #f2eee7 !important;
        }

        .ozt-grid-card
        .customer-product-image {
          width: 100% !important;
          height: 100% !important;

          object-fit: cover !important;
          display: block !important;
        }

        .ozt-grid-card
        .customer-product-info {
          flex: 1 !important;
          min-width: 0 !important;

          padding: 13px 12px 4px !important;
        }

        .ozt-grid-card
        .customer-product-info h3 {
          margin: 0 0 6px !important;

          color: #171717 !important;
          font-size: 14px !important;
          line-height: 1.15 !important;
          font-weight: 900 !important;
        }

        .ozt-grid-card
        .customer-product-info p {
          margin: 0 !important;

          color: #888 !important;
          font-size: 9px !important;
          line-height: 1.4 !important;

          display: -webkit-box !important;
          -webkit-box-orient: vertical !important;
          -webkit-line-clamp: 2 !important;
          overflow: hidden !important;
        }

        .ozt-grid-card
        .customer-product-price {
          display: block !important;

          padding: 0 12px 13px !important;

          color: #b88927 !important;
          font-size: 14px !important;
          font-weight: 950 !important;
        }

        .ozt-grid-card
        .customer-product-right {
          position: absolute !important;

          right: 8px !important;
          bottom: 8px !important;

          z-index: 5 !important;
        }

        .ozt-grid-card
        .add-to-cart-button {
          width: 37px !important;
          height: 37px !important;

          border: 0 !important;
          border-radius: 50% !important;

          background: #101820 !important;
          color: #fff !important;

          box-shadow:
            0 5px 14px rgba(0,0,0,0.22) !important;
        }

        .ozt-grid-card
        .add-to-cart-button span {
          font-size: 20px !important;
        }



        /* =====================================================
           IVORY / LUXURY 3D
        ===================================================== */

        .ozt-layout-ivory-3d {
          max-width: 760px;
          padding: 24px 18px 50px;
          background:
            radial-gradient(circle at 20% 0%, rgba(255,255,255,.95), transparent 32%),
            linear-gradient(180deg, #f6f0e6 0%, #eee6d8 100%);
          color: #241f18;
          border-radius: 34px;
        }

        .ozt-layout-ivory-3d .ozt-empty-category {
          background: rgba(255,255,255,.72);
          border-color: #e1d5c2;
          box-shadow: inset 0 1px 0 rgba(255,255,255,.9);
        }

        .ozt-ivory-hero {
          position: relative;
          min-height: 235px;
          margin-bottom: 28px;
          padding: 34px 28px 30px;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          overflow: hidden;
          border: 1px solid rgba(171,144,96,.35);
          border-radius: 28px;
          background:
            linear-gradient(145deg, #fffdf8 0%, #efe5d3 56%, #e4d5bd 100%);
          box-shadow:
            14px 16px 30px rgba(102,82,52,.16),
            -8px -8px 20px rgba(255,255,255,.82),
            inset 0 1px 0 rgba(255,255,255,.95);
          transform: perspective(1000px) rotateX(.35deg);
        }

        .ozt-ivory-hero::before {
          content: "";
          position: absolute;
          width: 210px;
          height: 210px;
          top: -115px;
          right: -35px;
          border-radius: 50%;
          border: 1px solid rgba(156,121,62,.22);
          box-shadow:
            0 0 0 24px rgba(255,255,255,.14),
            0 0 0 48px rgba(156,121,62,.08);
        }

        .ozt-ivory-orb {
          position: absolute;
          top: 28px;
          right: 54px;
          width: 82px;
          height: 82px;
          border-radius: 50%;
          background: linear-gradient(145deg, #fffaf0, #d8c3a2);
          box-shadow:
            9px 12px 18px rgba(76,55,29,.18),
            -5px -5px 12px rgba(255,255,255,.9),
            inset 2px 2px 5px rgba(255,255,255,.85),
            inset -3px -3px 8px rgba(135,108,70,.18);
        }

        .ozt-ivory-kicker {
          position: relative;
          z-index: 2;
          margin-bottom: 6px;
          color: #a67b32;
          font-size: 9px;
          font-weight: 950;
          letter-spacing: 4px;
        }

        .ozt-ivory-title {
          position: relative;
          z-index: 2;
          max-width: 80%;
          color: #221b13;
          font-family: Georgia, "Times New Roman", serif;
          font-size: clamp(34px, 7vw, 56px);
          line-height: .95;
          font-weight: 700;
          letter-spacing: -1.6px;
          text-shadow: 0 2px 0 rgba(255,255,255,.7);
        }

        .ozt-ivory-subtitle {
          position: relative;
          z-index: 2;
          margin-top: 9px;
          color: #756554;
          font-size: 12px;
          font-weight: 700;
        }

        .ozt-ivory-section {
          margin-bottom: 42px;
          scroll-margin-top: 90px;
        }

        .ozt-ivory-heading {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 14px;
          margin-bottom: 17px;
          padding: 0 4px;
        }

        .ozt-ivory-heading span {
          display: block;
          margin-bottom: 5px;
          color: #ae833d;
          font-size: 8px;
          font-weight: 950;
          letter-spacing: 3px;
        }

        .ozt-ivory-heading h2 {
          margin: 0 !important;
          color: #292117 !important;
          font-family: Georgia, "Times New Roman", serif !important;
          font-size: 30px !important;
          line-height: 1 !important;
          font-weight: 600 !important;
          letter-spacing: -.6px !important;
        }

        .ozt-ivory-count {
          min-width: 44px;
          height: 44px;
          display: grid;
          place-items: center;
          border-radius: 14px;
          color: #8f6625;
          font-size: 12px;
          font-weight: 950;
          background: linear-gradient(145deg, #fffaf1, #ded0b8);
          border: 1px solid #d5c3a4;
          box-shadow:
            6px 7px 13px rgba(92,69,37,.14),
            -5px -5px 11px rgba(255,255,255,.88),
            inset 1px 1px 3px rgba(255,255,255,.8);
        }

        .ozt-ivory-products {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 18px;
          perspective: 1100px;
        }

        .ozt-ivory-card {
          min-width: 0;
          transition: transform .18s ease, filter .18s ease;
        }

        .ozt-ivory-card:hover {
          transform: translateY(-4px) rotateX(1.1deg);
          filter: saturate(1.04);
        }

        .ozt-ivory-card .customer-product {
          position: relative !important;
          display: flex !important;
          flex-direction: column !important;
          width: 100% !important;
          height: 100% !important;
          padding: 0 !important;
          overflow: hidden !important;
          background: linear-gradient(145deg, #fffdf9 0%, #f1e9dc 100%) !important;
          border: 1px solid #e0d2bc !important;
          border-radius: 24px !important;
          box-shadow:
            12px 14px 25px rgba(81,60,31,.14),
            -7px -7px 16px rgba(255,255,255,.9),
            inset 0 1px 0 rgba(255,255,255,.95) !important;
          transform: translateZ(0);
        }

        .ozt-ivory-card .customer-product-image-wrap {
          position: relative !important;
          width: 100% !important;
          height: 200px !important;
          overflow: hidden !important;
          border-radius: 0 !important;
          background: linear-gradient(145deg, #fdfaf5, #e4d7c2) !important;
        }

        .ozt-ivory-card .customer-product-image-wrap::after {
          content: "";
          position: absolute;
          left: 14px;
          right: 14px;
          bottom: -18px;
          height: 38px;
          border-radius: 50%;
          background: rgba(79,59,33,.18);
          filter: blur(12px);
          pointer-events: none;
        }

        .ozt-ivory-card .customer-product-image {
          width: 100% !important;
          height: 100% !important;
          display: block !important;
          object-fit: cover !important;
          transition: transform .25s ease;
        }

        .ozt-ivory-card:hover .customer-product-image {
          transform: scale(1.035);
        }

        .ozt-ivory-card .customer-product-info {
          flex: 1 !important;
          min-width: 0 !important;
          padding: 14px 15px 5px !important;
        }

        .ozt-ivory-card .customer-product-info h3 {
          margin: 0 0 6px !important;
          color: #2a2117 !important;
          font-family: Georgia, "Times New Roman", serif !important;
          font-size: 18px !important;
          line-height: 1.1 !important;
          font-weight: 700 !important;
        }

        .ozt-ivory-card .customer-product-info p {
          margin: 0 !important;
          color: #776b5d !important;
          font-size: 10px !important;
          line-height: 1.45 !important;
          display: -webkit-box !important;
          -webkit-box-orient: vertical !important;
          -webkit-line-clamp: 2 !important;
          overflow: hidden !important;
        }

        .ozt-ivory-card .customer-product-price {
          display: block !important;
          padding: 0 15px 14px !important;
          color: #a9782a !important;
          font-size: 16px !important;
          font-weight: 950 !important;
        }

        .ozt-ivory-card .customer-product-right {
          position: absolute !important;
          right: 10px !important;
          bottom: 9px !important;
          z-index: 5 !important;
        }

        .ozt-ivory-card .add-to-cart-button {
          width: 42px !important;
          height: 42px !important;
          border: 1px solid #c9ad79 !important;
          border-radius: 14px !important;
          background: linear-gradient(145deg, #fffaf1, #d8bd8e) !important;
          color: #6f4d18 !important;
          box-shadow:
            6px 7px 12px rgba(83,58,25,.2),
            -4px -4px 9px rgba(255,255,255,.9),
            inset 1px 1px 2px rgba(255,255,255,.8) !important;
        }

        .ozt-ivory-card .add-to-cart-button span {
          font-size: 23px !important;
          line-height: 1 !important;
        }

        .ozt-ivory-card-feature .customer-product {
          grid-column: 1 / -1;
        }

        .ozt-ivory-card-feature .customer-product-image-wrap {
          height: 285px !important;
        }

        .ozt-ivory-card-feature .customer-product-info h3 {
          font-size: 23px !important;
        }

        .ozt-ivory-card-feature .customer-product-price {
          font-size: 18px !important;
        }


        /* =====================================================
           OZT APP PREMIUM — FINAL COMMERCIAL UI
        ===================================================== */

        .ozt-layout-glass-premium {
          position: relative !important;
          isolation: isolate !important;
          scroll-behavior: smooth;
          width: 100% !important;
          max-width: 900px !important;
          min-height: 100vh !important;
          margin: 0 auto !important;
          padding: 0 18px 108px !important;
          color: #f7f2e9 !important;
          background:
            radial-gradient(circle at 10% 0%, rgba(255,255,255,.045), transparent 24%),
            radial-gradient(circle at 92% 18%, rgba(224,180,100,.07), transparent 26%),
            linear-gradient(180deg, #0f1012 0%, #0a0b0c 100%) !important;
          border-radius: 0 !important;
          overflow: visible !important;
        }

        .ozt-layout-glass-premium::before {
          content: "";
          position: fixed;
          inset: 0;
          pointer-events: none;
          background:
            radial-gradient(circle at 50% -10%, rgba(255,220,160,.07), transparent 32%),
            linear-gradient(180deg, rgba(255,255,255,.015), transparent 20%);
          z-index: -1;
        }

        .ozt-layout-glass-premium .ozt-app-header {
          position: sticky !important;
          top: 0 !important;
          z-index: 80 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: space-between !important;
          gap: 12px !important;
          min-height: 58px !important;
          padding: 8px 4px !important;
          margin-bottom: 10px !important;
          background: rgba(10,11,12,.88) !important;
          color: #f7f2e9 !important;
          border-bottom: 1px solid rgba(255,255,255,.07) !important;
          backdrop-filter: blur(18px) !important;
          -webkit-backdrop-filter: blur(18px) !important;
        }

        .ozt-app-brand { display:flex; align-items:center; gap:10px; min-width:0; }
        .ozt-app-logo {
          width: 38px; height: 38px; flex:0 0 auto;
          display:grid; place-items:center;
          border-radius:12px;
          background: radial-gradient(circle at 35% 25%, #4b3c22, #151313 58%, #0b0b0c 100%);
          border:1px solid #8f7040;
          color:#ebd19b;
          font-family:Georgia,serif;
          font-size:11px;
          font-weight:800;
          box-shadow: 0 7px 20px rgba(0,0,0,.28), inset 0 1px 0 rgba(255,255,255,.08);
        }
        .ozt-app-brand strong { display:block; font-size:13px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .ozt-app-brand span { display:block; margin-top:2px; color:#8b8680; font-size:7px; letter-spacing:1.4px; }
        .ozt-app-table {
          flex:0 0 auto; padding:8px 11px; border-radius:999px;
          background:linear-gradient(145deg,#24201b,#151311);
          color:#ecd29b; border:1px solid rgba(220,186,117,.32);
          font-size:9px; font-weight:900;
        }
        .ozt-app-header-cart {
          position:relative;
          width:36px; height:36px; flex:0 0 auto;
          display:grid; place-items:center;
          margin-left:auto;
          border-radius:11px;
          text-decoration:none;
          color:#f2e4c6;
          background:#17181a;
          border:1px solid rgba(255,255,255,.08);
        }
        .ozt-app-header-cart > span { font-size:14px; }
        .ozt-app-header-cart b {
          position:absolute; right:-4px; top:-5px;
          min-width:16px; height:16px; padding:0 4px;
          display:grid; place-items:center;
          border-radius:999px; background:#e2b86e; color:#171515;
          border:2px solid #0f1012; font-size:7px; line-height:1;
        }

        .ozt-app-hero {
          position: relative !important;
          min-height: 360px !important;
          margin: 8px 0 12px !important;
          padding: 0 !important;
          overflow: hidden !important;
          border: 1px solid rgba(255,255,255,.11) !important;
          border-radius: 28px !important;
          background:#161719 !important;
          box-shadow: 0 22px 50px rgba(0,0,0,.30), 0 1px 0 rgba(255,255,255,.05) inset !important;
        }

        .ozt-app-hero-photo {
          position:absolute;
          inset:0;
          background:
            linear-gradient(180deg, rgba(0,0,0,.08) 18%, rgba(0,0,0,.42) 48%, rgba(0,0,0,.92) 100%),
            url("https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1200&q=85") center/cover;
          transform: scale(1.01);
        }

        .ozt-app-hero-overlay {
          position:absolute; inset:0;
          background:
            radial-gradient(circle at 78% 15%, rgba(255,228,171,.12), transparent 25%),
            linear-gradient(180deg, transparent 25%, rgba(5,5,6,.18) 46%, rgba(6,6,7,.90) 100%);
        }

        .ozt-app-hero-content { position:absolute; inset:auto 22px 22px; z-index:5; }
        .ozt-layout-glass-premium .ozt-glass-status { display:none !important; }
        }
        .ozt-app-hero .ozt-glass-status span { width:7px; height:7px; background:#54d394; box-shadow:0 0 0 4px rgba(84,211,148,.12); }
        .ozt-app-hero .ozt-glass-eyebrow { margin-top:0 !important; color:#e8c981; font-size:8px; letter-spacing:2.6px; }
        .ozt-app-hero .ozt-glass-hero-title {
          margin-top:7px; max-width:none; color:#fff;
          font-size:clamp(42px,9vw,70px); line-height:.92;
          text-shadow:0 8px 35px rgba(0,0,0,.35);
        }
        .ozt-app-hero .ozt-glass-hero-copy { color:rgba(255,255,255,.76); font-size:10px; max-width:480px; line-height:1.55; }
        .ozt-app-search {
          display:flex;
          align-items:center;
          gap:8px;
          margin-top:14px;
          padding:13px 14px;
          border:1px solid rgba(255,255,255,.16);
          border-radius:15px;
          background:rgba(10,10,11,.55);
          color:#fff;
          font-size:11px;
          backdrop-filter:blur(14px);
          box-shadow:0 8px 24px rgba(0,0,0,.22);
          transition:border-color .18s ease, box-shadow .18s ease;
        }

        .ozt-app-search-icon {
          flex:0 0 auto;
          color:#e2b86e !important;
          margin:0 !important;
          font-size:15px;
          line-height:1;
        }

        .ozt-app-search input {
          flex:1;
          min-width:0;
          width:100%;
          border:0;
          outline:0;
          background:transparent;
          color:#fff;
          font-family:inherit;
          font-size:11px;
        }

        .ozt-app-search input::placeholder {
          color:#aaa;
        }

        .ozt-app-search input::-webkit-search-cancel-button {
          display:none;
        }

        .ozt-app-search.has-search {
          border-color:rgba(226,184,110,.58);
          box-shadow:
            0 0 0 1px rgba(226,184,110,.10),
            0 8px 24px rgba(0,0,0,.22);
        }

        .ozt-app-search-clear {
          flex:0 0 auto;
          width:24px;
          height:24px;
          display:grid;
          place-items:center;
          padding:0;
          border:0;
          border-radius:50%;
          background:rgba(255,255,255,.10);
          color:#fff;
          font-size:17px;
          line-height:1;
          cursor:pointer;
        }

        .ozt-app-search-clear:hover {
          background:rgba(226,184,110,.24);
        }

        .ozt-app-search-empty {
          margin:24px 0 35px;
          padding:32px 20px;
          text-align:center;
          border:1px solid rgba(255,255,255,.10);
          border-radius:20px;
          background:rgba(255,255,255,.035);
        }

        .ozt-app-search-empty-icon {
          width:54px;
          height:54px;
          margin:0 auto 14px;
          display:grid;
          place-items:center;
          border-radius:50%;
          border:1px solid rgba(226,184,110,.35);
          color:#e2b86e;
          font-size:24px;
        }

        .ozt-app-search-empty h3 {
          margin:0 0 7px;
          color:#fff;
          font-size:18px;
        }

        .ozt-app-search-empty p {
          margin:0 auto 18px;
          max-width:300px;
          color:#999;
          font-size:11px;
          line-height:1.6;
        }

        .ozt-app-search-empty button {
          border:1px solid rgba(226,184,110,.45);
          border-radius:12px;
          padding:10px 15px;
          background:rgba(226,184,110,.10);
          color:#e2b86e;
          font-size:11px;
          font-weight:800;
          cursor:pointer;
        }

        .ozt-layout-glass-premium .ozt-app-category-strip {
          position:sticky !important; top:58px !important; z-index:65 !important;
          margin:0 -12px; padding:8px 12px 4px;
          background:linear-gradient(180deg,rgba(15,16,18,.96),rgba(15,16,18,.78),transparent);
          backdrop-filter:blur(10px); -webkit-backdrop-filter:blur(10px);
        }
        .ozt-app-categories {
          display:flex; gap:12px; overflow-x:auto;
          padding:2px 3px 15px;
          scrollbar-width:none;
          scroll-snap-type:x proximity;
        }
        .ozt-app-categories::-webkit-scrollbar { display:none; }
        .ozt-app-category {
          flex:0 0 66px; scroll-snap-align:start;
          text-decoration:none; color:#f4efe6; text-align:center;
          font-size:8px; font-weight:800;
        }
        .ozt-app-category-image {
          width:62px; height:62px; margin:0 auto 6px;
          border-radius:50%; overflow:hidden;
          border:1.5px solid rgba(221,185,111,.75);
          background:#1c1d20;
          display:grid; place-items:center;
          box-shadow:0 9px 20px rgba(0,0,0,.28), 0 1px 0 rgba(255,255,255,.08) inset;
        }
        .ozt-app-category-image img { width:100%;height:100%;object-fit:cover;display:block; }
        .ozt-app-category span { display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

        .ozt-layout-glass-premium .ozt-app-quick-actions {
          display:grid !important; grid-template-columns:repeat(3,minmax(0,1fr)) !important; gap:8px !important; margin:10px 0 22px !important;
        }
        .ozt-layout-glass-premium .ozt-app-action-button {
          min-width:0 !important; min-height:78px !important;
          display:flex !important; flex-direction:column !important; align-items:center !important; justify-content:center !important;
          gap:5px !important; padding:9px 7px !important;
          border-radius:17px !important; text-decoration:none !important;
          background:linear-gradient(145deg,#1a1b1e,#121315) !important;
          border:1px solid rgba(255,255,255,.10) !important;
          box-shadow:0 10px 24px rgba(0,0,0,.16), inset 0 1px 0 rgba(255,255,255,.05) !important;
          color:#f4eee4 !important; cursor:pointer !important;
          transition:transform .16s ease, border-color .16s ease !important;
        }
        .ozt-app-action-button:hover { transform:translateY(-2px); border-color:rgba(223,188,118,.28); }
        .ozt-app-action-button span { font-size:16px; color:#e9c987; }
        .ozt-app-action-button strong { font-size:9px; }
        .ozt-app-action-button small { font-size:7px; color:#89857f; }

        .ozt-app-message { margin:0 0 14px; padding:10px 12px; border-radius:13px; text-align:center; font-size:9px; font-weight:800; }
        .ozt-app-message.success { background:#153322;color:#8be0aa;border:1px solid #2d704a; }
        .ozt-app-message.error { background:#3a1717;color:#ffb0b0;border:1px solid #754040; }

        .ozt-app-section { margin-bottom:30px; scroll-margin-top:82px; }
        .ozt-app-section-heading { display:flex; justify-content:space-between; align-items:end; gap:10px; margin-bottom:11px; padding:0 2px; }
        .ozt-app-section-heading > div > span { color:#d7b56e; font-size:7px; letter-spacing:2.7px; font-weight:900; }
        .ozt-app-section-heading h2 { margin:4px 0 0; color:#fff; font-family:Georgia,serif; font-size:31px; line-height:1; }
        .ozt-app-section-heading small,.ozt-app-section-heading > strong { color:#89857e; font-size:8px; }

        .ozt-app-featured-row {
          display:flex; gap:11px; overflow-x:auto;
          scroll-snap-type:x mandatory; padding:0 0 7px;
          scrollbar-width:none;
        }
        .ozt-app-featured-row::-webkit-scrollbar { display:none; }
        .ozt-app-feature-card {
          position:relative; flex:0 0 72%; scroll-snap-align:start; min-width:0;
        }
        .ozt-app-feature-card .customer-product {
          border:1px solid rgba(255,255,255,.09)!important;
          background:linear-gradient(150deg,#252328,#151619)!important;
          color:#fff!important; border-radius:21px!important;
          box-shadow:0 14px 28px rgba(0,0,0,.27)!important; overflow:hidden!important;
        }
        .ozt-app-feature-card .customer-product-image-wrap { height:190px!important; border-radius:0!important; }
        .ozt-app-feature-card .customer-product-info { padding:11px 12px 4px!important; }
        .ozt-app-feature-card .customer-product-info h3 { color:#fff!important; font-family:Georgia,serif!important; font-size:18px!important; }
        .ozt-app-feature-card .customer-product-info p { color:#a4a09c!important; font-size:8px!important; }
        .ozt-app-feature-card .customer-product-price { color:#f0cb83!important; padding:0 12px 12px!important; font-size:15px!important; }
        .ozt-app-feature-card .customer-product-right { opacity:0!important; pointer-events:none!important; }
        .ozt-app-quick-add {
          position:absolute; right:14px; bottom:14px; z-index:8;
          width:44px; height:44px; border-radius:14px;
          border:1px solid #f6e4c4; background:linear-gradient(145deg,#fff5e4,#e9ca94);
          color:#151515; font-size:24px; display:grid; place-items:center;
          cursor:pointer; box-shadow:0 10px 24px rgba(0,0,0,.28), inset 0 1px 0 rgba(255,255,255,.75);
        }

        .ozt-glass-section-heading {
          display:flex; align-items:flex-end; justify-content:space-between; gap:14px;
          margin-bottom:12px; padding:0 2px;
        }
        .ozt-glass-section-kicker { margin-bottom:4px; color:#ba9a61; font-size:8px; font-weight:950; letter-spacing:2.4px; }
        .ozt-glass-section-heading h2 { margin:0!important; color:#fff!important; font-family:Georgia,"Times New Roman",serif!important; font-size:31px!important; line-height:.96!important; font-weight:600!important; }
        .ozt-glass-section-heading p { margin:5px 0 0!important; color:#7f7b76!important; font-size:9px!important; }
        .ozt-glass-section-badge { display:grid; place-items:center; min-width:44px; height:30px; border:1px solid rgba(219,181,111,.18); border-radius:10px; background:#17181a; color:#bda778; font-size:8px; font-weight:900; }

        .ozt-app-product-list { display:grid; gap:9px; }
        .ozt-app-product-row { position:relative; min-width:0; }
        .ozt-app-product-row .customer-product {
          display:grid!important; grid-template-columns:92px minmax(0,1fr)!important; align-items:center!important;
          width:100%!important; min-height:102px!important; padding:7px!important;
          background:linear-gradient(145deg,#1b1c20,#131416)!important;
          border:1px solid rgba(255,255,255,.07)!important; border-radius:17px!important;
          color:#fff!important; box-shadow:0 9px 20px rgba(0,0,0,.20)!important; overflow:hidden!important;
          transition:transform .15s ease, border-color .15s ease;
        }
        .ozt-app-product-row .customer-product:hover { transform:translateY(-2px); border-color:rgba(220,183,113,.18)!important; }
        .ozt-app-product-row .customer-product-image-wrap { width:92px!important; height:88px!important; border-radius:11px!important; }
        .ozt-app-product-row .customer-product-info { padding:7px 12px!important; }
        .ozt-app-product-row .customer-product-info h3 { color:#fff!important; font-size:14px!important; }
        .ozt-app-product-row .customer-product-info p { color:#8e8b87!important; font-size:8px!important; }
        .ozt-app-product-row .customer-product-price { color:#edc97f!important; padding:0!important; font-size:13px!important; }
        .ozt-app-product-row .customer-product-right { opacity:0!important; pointer-events:none!important; }
        .ozt-app-row-add { right:10px; bottom:10px; width:36px; height:36px; border-radius:12px; font-size:20px; }

        .ozt-layout-glass-premium .ozt-app-bottom-nav {
          position:fixed !important; left:50% !important; bottom:12px !important; z-index:120 !important;
          width:min(796px, calc(100vw - 24px));
          transform:translateX(-50%);
          display:grid; grid-template-columns:1fr 1fr; gap:6px;
          padding:6px;
          border-radius:19px;
          background:rgba(18,19,21,.94);
          border:1px solid rgba(255,255,255,.10);
          backdrop-filter:blur(18px); -webkit-backdrop-filter:blur(18px);
          box-shadow:0 16px 34px rgba(0,0,0,.44);
        }
        .ozt-app-bottom-nav a {
          position:relative; min-height:46px;
          display:flex; align-items:center; justify-content:center; gap:7px;
          border-radius:14px; text-decoration:none;
          color:#eee8de; font-size:9px; font-weight:900;
        }
        .ozt-app-bottom-nav a.active { background:linear-gradient(145deg,#fff2d9,#dcb776); color:#181616; }
        .ozt-app-bottom-nav a span { font-size:14px; }

        .ozt-layout-glass-premium .ozt-app-cart-panel {
          margin:18px 0 24px !important; padding:16px !important;
          border-radius:23px;
          background:linear-gradient(160deg,#202126,#121316);
          border:1px solid rgba(255,255,255,.10);
          box-shadow:0 16px 35px rgba(0,0,0,.28);
          scroll-margin-top:84px;
        }
        .ozt-app-cart-panel.is-empty { padding-bottom:18px; }
        .ozt-app-cart-empty {
          display:flex; flex-direction:column; align-items:center; justify-content:center;
          gap:7px; padding:22px 14px 10px; text-align:center;
        }
        .ozt-app-cart-empty-icon {
          width:48px; height:48px; display:grid; place-items:center;
          border-radius:15px; background:#191a1d; border:1px solid rgba(255,255,255,.08);
          font-size:21px; box-shadow:inset 0 1px 0 rgba(255,255,255,.04);
        }
        .ozt-app-cart-empty strong { color:#fff; font-size:12px; }
        .ozt-app-cart-empty span { max-width:270px; color:#85817c; font-size:8px; line-height:1.5; }
        .ozt-app-cart-empty a { color:#edc97f; text-decoration:none; font-size:9px; font-weight:900; margin-top:2px; }
        .ozt-app-cart-items { display:grid; gap:8px; }
        .ozt-app-cart-item {
          display:grid; grid-template-columns:50px minmax(0,1fr) auto auto; gap:8px; align-items:center;
          padding:8px; border-radius:14px; background:#18191c; border:1px solid rgba(255,255,255,.06);
        }
        .ozt-app-cart-item img,.ozt-app-cart-placeholder { width:50px;height:50px;border-radius:10px;object-fit:cover;background:#25252a;display:grid;place-items:center; }
        .ozt-app-cart-info strong { display:block;color:#fff;font-size:10px; }
        .ozt-app-cart-info span { display:block;color:#e2bd75;font-size:9px;margin-top:3px; }
        .ozt-app-cart-controls { display:flex;align-items:center;gap:5px; }
        .ozt-app-cart-controls button { width:24px;height:24px;border-radius:8px;border:1px solid rgba(255,255,255,.12);background:#25252a;color:#fff; }
        .ozt-app-cart-controls b { min-width:14px;text-align:center;font-size:9px; }
        .ozt-app-cart-remove { width:26px;height:26px;border:0;border-radius:8px;background:#2a1a1a;color:#f08c8c; }
        .ozt-app-cart-total { display:flex;justify-content:space-between;align-items:center;margin-top:10px;padding-top:11px;border-top:1px solid rgba(255,255,255,.08);color:#aaa;font-size:10px; }
        .ozt-app-cart-total strong { color:#fff;font-size:17px; }
        .ozt-app-order-button { display:flex;align-items:center;justify-content:center;min-height:50px;margin-top:10px;border-radius:15px;background:linear-gradient(145deg,#fff3dc,#dcb777);color:#171515;text-decoration:none;font-size:11px;font-weight:950;box-shadow:0 9px 22px rgba(0,0,0,.22); }

        /* PREMIUM — PRODUCT DETAIL MODAL */
        .ozt-layout-glass-premium .product-modal-overlay {
          background:rgba(0,0,0,.78)!important;
          backdrop-filter:blur(12px)!important;
          -webkit-backdrop-filter:blur(12px)!important;
        }
        .ozt-layout-glass-premium .product-modal {
          background:linear-gradient(160deg,#202126,#101113)!important;
          color:#fff!important;
          border:1px solid rgba(255,255,255,.10)!important;
          border-radius:26px!important;
          box-shadow:0 30px 80px rgba(0,0,0,.55)!important;
          overflow:hidden!important;
        }
        .ozt-layout-glass-premium .product-modal-image-area { background:#151619!important; }
        .ozt-layout-glass-premium .product-modal-content { background:linear-gradient(180deg,#202126,#141518)!important; }
        .ozt-layout-glass-premium .product-modal-heading h2 { color:#fff!important; font-family:Georgia,serif!important; }
        .ozt-layout-glass-premium .product-modal-price { color:#f0cb83!important; }
        .ozt-layout-glass-premium .product-modal-description { color:#b0aca6!important; }
        .ozt-layout-glass-premium .product-modal-info-box,
        .ozt-layout-glass-premium .product-modal-allergen-box { background:#18191c!important; border-color:rgba(255,255,255,.08)!important; color:#c4beb4!important; }
        .ozt-layout-glass-premium .product-modal-divider { background:rgba(255,255,255,.08)!important; }
        .ozt-layout-glass-premium .quantity-title { color:#aaa!important; }
        .ozt-layout-glass-premium .quantity-selector { background:#18191c!important; border-color:rgba(255,255,255,.08)!important; }
        .ozt-layout-glass-premium .quantity-selector button { background:#292a2e!important; color:#fff!important; }
        .ozt-layout-glass-premium .quantity-selector strong { color:#fff!important; }
        .ozt-layout-glass-premium .product-modal-total { color:#aaa!important; }
        .ozt-layout-glass-premium .product-modal-total strong { color:#fff!important; }
        .ozt-layout-glass-premium .product-modal-add { background:linear-gradient(145deg,#fff3dc,#dcb777)!important; color:#171515!important; }
        .ozt-layout-glass-premium .product-modal-note { color:#827c74!important; }
        .ozt-layout-glass-premium .product-modal-close { background:rgba(0,0,0,.52)!important; color:#fff!important; border-color:rgba(255,255,255,.14)!important; }

        .ozt-app-footer { padding:24px 0 8px; text-align:center; color:#65615c; font-size:7px; letter-spacing:2.1px; }

        @media (max-width: 520px) {
          .ozt-layout-glass-premium { padding-left:10px !important; padding-right:10px !important; padding-bottom:104px !important; max-width:520px !important; }
          .ozt-app-header { padding-left:2px; padding-right:2px; }
          .ozt-app-category-strip { top:56px; margin:0 -8px; padding-left:8px; padding-right:8px; }
          .ozt-app-hero { min-height:380px !important; border-radius:24px !important; }
          .ozt-app-hero-content { inset:auto 18px 18px; }
          .ozt-app-quick-actions { gap:7px; }
          .ozt-app-action-button { min-height:72px; }
          .ozt-app-feature-card { flex: 0 0 78% !important; }
          .ozt-app-feature-card .customer-product-image-wrap { height:172px !important; }
          .ozt-app-bottom-nav { width:calc(100vw - 18px); bottom:9px; }
          .ozt-app-cart-item { grid-template-columns:44px minmax(0,1fr) auto; }
          .ozt-app-cart-item img, .ozt-app-cart-placeholder { width:44px; height:44px; }
          .ozt-app-cart-remove { grid-column:3; }
          .ozt-app-cart-controls { grid-column:2; justify-self:start; margin-top:4px; }
        }

        /* =====================================================
           TABLET
        ===================================================== */

        @media (min-width: 521px) {

          .ozt-editorial-feature
          .customer-product-image-wrap {
            height: 360px !important;
          }

          .ozt-grid-card
          .customer-product-image-wrap {
            height: 220px !important;
          }
        }

        /* =====================================================
           TELEFON
        ===================================================== */

        @media (max-width: 520px) {

          .ozt-layout-ivory-3d {
            padding: 14px 12px 38px;
            border-radius: 24px;
          }

          .ozt-ivory-hero {
            min-height: 205px;
            margin-bottom: 24px;
            padding: 26px 20px 24px;
            border-radius: 23px;
          }

          .ozt-ivory-orb {
            top: 24px;
            right: 26px;
            width: 62px;
            height: 62px;
          }

          .ozt-ivory-title {
            max-width: 86%;
            font-size: 38px;
          }

          .ozt-ivory-subtitle {
            font-size: 10px;
          }

          .ozt-ivory-section {
            margin-bottom: 34px;
          }

          .ozt-ivory-heading h2 {
            font-size: 25px !important;
          }

          .ozt-ivory-count {
            min-width: 38px;
            height: 38px;
            border-radius: 12px;
          }

          .ozt-ivory-products {
            gap: 11px;
          }

          .ozt-ivory-card .customer-product {
            border-radius: 18px !important;
          }

          .ozt-ivory-card .customer-product-image-wrap {
            height: 145px !important;
          }

          .ozt-ivory-card .customer-product-info {
            padding: 11px 10px 4px !important;
          }

          .ozt-ivory-card .customer-product-info h3 {
            font-size: 14px !important;
          }

          .ozt-ivory-card .customer-product-info p {
            font-size: 8px !important;
          }

          .ozt-ivory-card .customer-product-price {
            padding: 0 10px 11px !important;
            font-size: 13px !important;
          }

          .ozt-ivory-card .customer-product-right {
            right: 7px !important;
            bottom: 7px !important;
          }

          .ozt-ivory-card .add-to-cart-button {
            width: 34px !important;
            height: 34px !important;
            border-radius: 11px !important;
          }

          .ozt-ivory-card .add-to-cart-button span {
            font-size: 19px !important;
          }

          .ozt-ivory-card-feature .customer-product-image-wrap {
            height: 215px !important;
          }

          .ozt-ivory-card-feature .customer-product-info h3 {
            font-size: 19px !important;
          }


          .ozt-layout {
            padding-left: 12px;
            padding-right: 12px;
          }

          /* -------------------------------
             CLASSIC MOBILE
          ------------------------------- */

          .ozt-classic-section {
            margin-bottom: 35px;
          }

          .ozt-classic-category-header h2 {
            font-size: 21px !important;
          }

          .ozt-classic-product-wrapper
          .customer-product {
            grid-template-columns:
              105px minmax(0, 1fr) 38px !important;

            gap: 10px !important;

            min-height: 105px !important;

            padding: 8px !important;

            border-radius: 16px !important;
          }

          .ozt-classic-product-wrapper
          .customer-product-image-wrap {
            width: 105px !important;
            height: 95px !important;
          }

          .ozt-classic-product-wrapper
          .customer-product-info h3 {
            font-size: 13px !important;
          }

          .ozt-classic-product-wrapper
          .customer-product-info p {
            font-size: 9px !important;
            margin-bottom: 7px !important;
          }

          .ozt-classic-product-wrapper
          .customer-product-price {
            font-size: 13px !important;
          }

          .ozt-classic-product-wrapper
          .add-to-cart-button {
            width: 34px !important;
            height: 34px !important;
          }

          /* -------------------------------
             EDITORIAL MOBILE
          ------------------------------- */

          .ozt-layout-editorial {
            padding-left: 14px;
            padding-right: 14px;
          }

          .ozt-editorial-heading-row h2 {
            font-size: 28px !important;
          }

          .ozt-editorial-feature
          .customer-product-image-wrap {
            height: 250px !important;
          }

          .ozt-editorial-feature
          .customer-product-info {
            padding: 15px 16px 5px !important;
          }

          .ozt-editorial-feature
          .customer-product-info h3 {
            font-size: 21px !important;
          }

          .ozt-editorial-feature
          .customer-product-price {
            padding: 0 16px 16px !important;
          }

          .ozt-editorial-feature
          .customer-product-right {
            right: 13px !important;
            bottom: 13px !important;
          }

          .ozt-editorial-feature
          .add-to-cart-button {
            width: 43px !important;
            height: 43px !important;
          }

          .ozt-editorial-standard
          .customer-product {
            grid-template-columns:
              105px minmax(0, 1fr) 35px !important;

            gap: 10px !important;

            min-height: 105px !important;
          }

          .ozt-editorial-standard
          .customer-product-image-wrap {
            width: 105px !important;
            height: 105px !important;
          }

          .ozt-editorial-standard
          .customer-product-info {
            padding: 10px 0 !important;
          }

          .ozt-editorial-standard
          .customer-product-info h3 {
            font-size: 14px !important;
          }

          .ozt-editorial-standard
          .customer-product-info p {
            font-size: 9px !important;
          }

          .ozt-editorial-standard
          .customer-product-price {
            font-size: 13px !important;
          }

          .ozt-editorial-standard
          .add-to-cart-button {
            width: 32px !important;
            height: 32px !important;
          }

          /* -------------------------------
             GRID MOBILE
          ------------------------------- */

          .ozt-grid-products {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));

            gap: 9px;
          }

          .ozt-grid-heading h2 {
            font-size: 23px !important;
          }

          .ozt-grid-card
          .customer-product-image-wrap {
            height: 135px !important;
          }

          .ozt-grid-card
          .customer-product-info {
            padding: 11px 9px 4px !important;
          }

          .ozt-grid-card
          .customer-product-info h3 {
            font-size: 12px !important;
          }

          .ozt-grid-card
          .customer-product-info p {
            font-size: 8px !important;
          }

          .ozt-grid-card
          .customer-product-price {
            padding: 0 9px 10px !important;
            font-size: 12px !important;
          }

          .ozt-grid-card
          .customer-product-right {
            right: 6px !important;
            bottom: 6px !important;
          }

          .ozt-grid-card
          .add-to-cart-button {
            width: 31px !important;
            height: 31px !important;
          }

          .ozt-grid-card
          .add-to-cart-button span {
            font-size: 17px !important;
          }
        }


        /* =====================================================
           MİRA KITCHEN — PREMIUM FINAL OVERRIDES
           Yalnızca ozt-glass-premium teması
        ===================================================== */

        .ozt-layout-glass-premium .ozt-app-logo {
          overflow: hidden;
          background: #0f1114 !important;
          border-color: rgba(214,168,59,.55) !important;
        }

        .ozt-layout-glass-premium .ozt-app-logo-image {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: contain;
          border-radius: inherit;
          padding: 4px;
        }

        .ozt-layout-glass-premium .ozt-app-hero-photo {
          background-position: center !important;
          background-size: cover !important;
        }

        .ozt-layout-glass-premium .ozt-app-category-strip {
          position: static !important;
          margin-top: 12px !important;
        }

        .ozt-layout-glass-premium .ozt-app-categories {
          display: flex !important;
          gap: 10px !important;
          overflow-x: auto !important;
          padding: 0 1px 7px !important;
        }

        .ozt-layout-glass-premium .ozt-app-category {
          flex: 0 0 78px !important;
        }

        .ozt-layout-glass-premium .ozt-app-category-image {
          width: 62px !important;
          height: 62px !important;
          margin: 0 auto 6px !important;
        }

        .ozt-layout-glass-premium .ozt-app-category span {
          font-size: 8px !important;
          font-weight: 800 !important;
        }

        .ozt-layout-glass-premium .ozt-app-quick-actions {
          grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          gap: 9px !important;
          margin: 12px 0 22px !important;
        }

        .ozt-layout-glass-premium .ozt-app-action-button {
          min-height: 68px !important;
          padding: 9px 7px !important;
        }

        .ozt-layout-glass-premium .ozt-app-action-button strong {
          font-size: 10px !important;
        }

        .ozt-layout-glass-premium .ozt-app-action-button small {
          font-size: 7px !important;
        }

        .ozt-layout-glass-premium .ozt-app-featured-row {
          display: flex !important;
          flex-direction: row !important;
          flex-wrap: nowrap !important;
          gap: 10px !important;
          overflow-x: auto !important;
          overflow-y: hidden !important;
          scroll-snap-type: x mandatory !important;
          scrollbar-width: none;
          -webkit-overflow-scrolling: touch;
          padding-bottom: 8px !important;
        }

        .ozt-layout-glass-premium .ozt-app-featured-row::-webkit-scrollbar {
          display: none;
        }

        .ozt-layout-glass-premium .ozt-app-feature-card {
          flex: 0 0 74% !important;
          min-width: 0 !important;
          scroll-snap-align: start !important;
          padding: 6px !important;
          border-radius: 17px !important;
        }

        .ozt-layout-glass-premium .ozt-app-feature-card .customer-product-image-wrap {
          height: 138px !important;
          border-radius: 12px !important;
        }

        .ozt-layout-glass-premium .ozt-app-feature-card .customer-product-info {
          padding: 8px 6px 31px !important;
        }

        .ozt-layout-glass-premium .ozt-app-feature-card .customer-product-info h3 {
          font-size: 15px !important;
          line-height: 1.1 !important;
        }

        .ozt-layout-glass-premium .ozt-app-feature-card .customer-product-info p {
          margin-bottom: 7px !important;
          font-size: 9px !important;
        }

        .ozt-layout-glass-premium .ozt-app-feature-card .customer-product-price {
          padding: 0 6px 8px !important;
          font-size: 14px !important;
        }

        .ozt-layout-glass-premium .ozt-app-quick-add {
          width: 34px !important;
          height: 34px !important;
          right: 8px !important;
          bottom: 8px !important;
          border-radius: 11px !important;
        }

        .ozt-layout-glass-premium .ozt-app-product-list {
          display: flex !important;
          flex-direction: column !important;
          gap: 9px !important;
        }

        .ozt-layout-glass-premium .ozt-app-product-row {
          padding: 5px !important;
          border-radius: 15px !important;
        }

        .ozt-layout-glass-premium .ozt-app-product-row .customer-product {
          grid-template-columns: 88px minmax(0, 1fr) !important;
          min-height: 88px !important;
          gap: 10px !important;
        }

        .ozt-layout-glass-premium .ozt-app-product-row .customer-product-image-wrap {
          width: 88px !important;
          height: 88px !important;
          border-radius: 11px !important;
        }

        .ozt-layout-glass-premium .ozt-app-product-row .customer-product-info {
          padding: 5px 40px 5px 0 !important;
        }

        .ozt-layout-glass-premium .ozt-app-product-row .customer-product-info h3 {
          font-size: 13px !important;
        }

        .ozt-layout-glass-premium .ozt-app-product-row .customer-product-info p {
          font-size: 9px !important;
          line-height: 1.3 !important;
        }

        .ozt-layout-glass-premium .ozt-app-product-row .customer-product-price {
          font-size: 13px !important;
        }

        .ozt-layout-glass-premium .ozt-app-row-add {
          width: 34px !important;
          height: 34px !important;
          right: 8px !important;
          bottom: 8px !important;
          border-radius: 11px !important;
        }

        .ozt-layout-glass-premium .ozt-app-bottom-nav {
          left: 50% !important;
          width: min(92vw, 540px) !important;
          transform: translateX(-50%) !important;
          bottom: 10px !important;
        }

        .ozt-layout-glass-premium .ozt-app-cart-panel {
          margin-top: 28px !important;
          margin-bottom: 10px !important;
        }

        @media (max-width: 430px) {
          .ozt-layout-glass-premium {
            padding-left: 8px !important;
            padding-right: 8px !important;
          }

          .ozt-layout-glass-premium .ozt-app-header {
            padding-left: 2px !important;
            padding-right: 2px !important;
          }

          .ozt-layout-glass-premium .ozt-app-hero-photo {
            min-height: 245px !important;
          }

          .ozt-layout-glass-premium .ozt-app-featured-row {
            display: flex !important;
            flex-direction: row !important;
            flex-wrap: nowrap !important;
            overflow-x: auto !important;
            overflow-y: hidden !important;
            gap: 9px !important;
            scroll-snap-type: x mandatory !important;
          }

          .ozt-layout-glass-premium .ozt-app-feature-card .customer-product-image-wrap {
            height: 106px !important;
          }

          .ozt-layout-glass-premium .ozt-app-feature-card .customer-product-info h3 {
            font-size: 13px !important;
          }

          .ozt-layout-glass-premium .ozt-app-feature-card .customer-product-info p {
            font-size: 8px !important;
          }

          .ozt-layout-glass-premium .ozt-app-product-row .customer-product {
            grid-template-columns: 78px minmax(0, 1fr) !important;
          }

          .ozt-layout-glass-premium .ozt-app-product-row .customer-product-image-wrap {
            width: 78px !important;
            height: 78px !important;
          }
        }
          

      `}</style>

      {layout === "classic" && (
        <ClassicLayout
          categories={categories}
          products={products}
          layout="classic"
        />
      )}

      {layout === "editorial" && (
        <EditorialLayout
          categories={categories}
          products={products}
          layout="editorial"
        />
      )}

      {layout === "grid" && (
        <GridLayout
          categories={categories}
          products={products}
          layout="grid"
        />
      )}

      {layout === "ivory" && (
        <IvoryLuxury3DLayout
          categories={categories}
          products={products}
          layout="ivory"
        />
      )}

      {layout === "ozt-glass-premium" && (
        <OztGlassPremiumLayout
          categories={categories}
          products={products}
          layout="ozt-glass-premium"
          showCart={showCart}
          restaurantName={restaurantName}
          tableNumber={tableNumber}
          slug={slug}
          masa={masa}
          garson={garson}
          waiterAction={waiterAction}
        />
      )}
    </>
  );
}