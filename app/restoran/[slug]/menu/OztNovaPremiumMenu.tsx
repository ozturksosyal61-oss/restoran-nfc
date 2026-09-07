"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import ProductCard from "./ProductCard";
import { useCart } from "./CartContext";
import {
  callNovaWaiter,
  requestNovaBill,
} from "./novaActions";

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
  ingredients?: string | null;
  allergens?: string | null;
  is_available?: boolean;
  sort_order?: number;
};

type Restaurant = {
  id: number;
  name: string;
  description: string | null;
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

export default function OztNovaPremiumMenu({
  slug: slugProp,
}: {
  slug?: string;
}) {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug =
    slugProp ||
    (params.slug as string);

  const {
    items,
    total,
    itemCount,
    increaseQuantity,
    decreaseQuantity,
    removeFromCart,
  } = useCart();

  const [restaurant, setRestaurant] =
    useState<Restaurant | null>(null);
  const [categories, setCategories] =
    useState<Category[]>([]);
  const [products, setProducts] =
    useState<Product[]>([]);

  const [loading, setLoading] =
    useState(true);
  const [error, setError] =
    useState("");

  const [tableToken, setTableToken] =
    useState("");
  const [tableNumber, setTableNumber] =
    useState<number | null>(null);

  const [activeCategory, setActiveCategory] =
    useState<number | null>(null);
  const [search, setSearch] =
    useState("");

  const [cartOpen, setCartOpen] =
    useState(false);
  const [serviceOpen, setServiceOpen] =
    useState(false);

  const [toast, setToast] =
    useState("");

  const garsonStatus =
    searchParams.get("garson") || "";
  const hesapStatus =
    searchParams.get("hesap") || "";

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const { createClient } =
          await import("../../../../lib/supabase/client");
        const supabase = createClient();

        const {
          data: restaurantData,
          error: restaurantError,
        } = await supabase
          .from("restaurants")
          .select(
            "id,name,description,logo_url,cover_image_url,instagram_url,google_review_url,is_open,opening_time,closing_time"
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

        const {
          data: categoryData,
          error: categoryError,
        } = await supabase
          .from("categories")
          .select("id,name,sort_order")
          .eq(
            "restaurant_id",
            restaurantData.id
          )
          .order("sort_order", {
            ascending: true,
          });

        if (categoryError) {
          console.error(
            "Nova kategori hatası:",
            categoryError
          );
        }

        const safeCategories =
          (categoryData || []) as Category[];

        let safeProducts: Product[] = [];

        if (safeCategories.length > 0) {
          const categoryIds =
            safeCategories.map(
              (category) => category.id
            );

          const {
            data: productData,
            error: productError,
          } = await supabase
            .from("products")
            .select(
              "id,category_id,name,description,price,image_url,ingredients,allergens,is_available,sort_order"
            )
            .in(
              "category_id",
              categoryIds
            )
            .eq("is_available", true)
            .order("sort_order", {
              ascending: true,
            });

          if (productError) {
            console.error(
              "Nova ürün hatası:",
              productError
            );
          }

          safeProducts =
            (productData || []) as Product[];
        }

        let nextTableToken =
          searchParams.get("masa")?.trim() ||
          "";

        if (!nextTableToken) {
          nextTableToken =
            getSavedTableToken();
        }

        let nextTableNumber:
          number | null = null;

        if (nextTableToken) {
          const {
            data: tableData,
            error: tableError,
          } = await supabase
            .from("restaurant_tables")
            .select(
              "id,table_number,public_token,is_active"
            )
            .eq(
              "restaurant_id",
              restaurantData.id
            )
            .eq(
              "public_token",
              nextTableToken
            )
            .eq("is_active", true)
            .maybeSingle();

          if (tableError) {
            console.error(
              "Nova masa doğrulama hatası:",
              tableError
            );
          }

          if (tableData) {
            nextTableNumber =
              Number(tableData.table_number);

            try {
              window.localStorage.setItem(
                "ozt_table_token",
                tableData.public_token
              );
            } catch {
              // localStorage kullanılamıyorsa akış devam eder.
            }
          } else if (
            searchParams.get("masa")
          ) {
            nextTableToken = "";
            try {
              window.localStorage.removeItem(
                "ozt_table_token"
              );
            } catch {
              // ignore
            }
          }
        }

        if (cancelled) {
          return;
        }

        setRestaurant(
          restaurantData as Restaurant
        );
        setCategories(safeCategories);
        setProducts(safeProducts);
        setTableToken(nextTableToken);
        setTableNumber(nextTableNumber);

        if (safeCategories.length > 0) {
          setActiveCategory(
            safeCategories[0].id
          );
        }
      } catch (loadError) {
        console.error(
          "Nova menü yükleme hatası:",
          loadError
        );

        if (!cancelled) {
          setError(
            "Menü yüklenirken bir hata oluştu."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [slug, searchParams]);

  useEffect(() => {
    if (!toast) return;

    const timer = window.setTimeout(
      () => setToast(""),
      2400
    );

    return () => {
      window.clearTimeout(timer);
    };
  }, [toast]);

  useEffect(() => {
    if (!garsonStatus && !hesapStatus) {
      return;
    }

    const message =
      garsonStatus === "ok"
        ? "Garson çağrınız iletildi."
        : garsonStatus === "hata"
        ? "Garson çağrısı gönderilemedi."
        : hesapStatus === "ok"
        ? "Hesap talebiniz iletildi."
        : "Hesap talebi gönderilemedi.";

    setToast(message);

    const cleanUrl =
      tableToken
        ? `/restoran/${encodeURIComponent(
            slug
          )}/menu?masa=${encodeURIComponent(
            tableToken
          )}`
        : `/restoran/${encodeURIComponent(
            slug
          )}/menu`;

    window.history.replaceState(
      {},
      "",
      cleanUrl
    );
  }, [
    garsonStatus,
    hesapStatus,
    slug,
    tableToken,
  ]);

  const normalizedSearch =
    search.trim().toLocaleLowerCase(
      "tr-TR"
    );

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesCategory =
        activeCategory === null ||
        product.category_id ===
          activeCategory;

      const searchable = [
        product.name,
        product.description || "",
        product.ingredients || "",
      ]
        .join(" ")
        .toLocaleLowerCase("tr-TR");

      const matchesSearch =
        !normalizedSearch ||
        searchable.includes(
          normalizedSearch
        );

      return (
        matchesCategory &&
        matchesSearch
      );
    });
  }, [
    products,
    activeCategory,
    normalizedSearch,
  ]);

  const featuredProducts =
    products.slice(0, 3);

  function preserveTableQuery(
    path: string
  ) {
    const token =
      tableToken || getSavedTableToken();

    if (!token) {
      return path;
    }

    return `${path}?masa=${encodeURIComponent(
      token
    )}`;
  }

  function goToOrder() {
    if (items.length === 0) {
      return;
    }

    const path =
      `/restoran/${encodeURIComponent(
        slug
      )}/siparis`;

    const target =
      preserveTableQuery(path);

    if (tableToken) {
      try {
        window.localStorage.setItem(
          "ozt_table_token",
          tableToken
        );
      } catch {
        // ignore
      }
    }

    router.push(target);
  }

  function goHome() {
    const target =
      preserveTableQuery(
        `/restoran/${encodeURIComponent(
          slug
        )}`
      );

    router.push(target);
  }

  function openBill() {
    router.push(
      preserveTableQuery(
        `/restoran/${encodeURIComponent(
          slug
        )}/odeme`
      )
    );
  }

  function openLastOrder() {
    const token =
      tableToken || getSavedTableToken();

    if (!token) {
      setToast(
        "Sipariş takibi için masa bağlantısı bulunamadı."
      );
      return;
    }

    try {
      const keys = [
        `ozt_last_order_${slug}_${token}`,
        "ozt_last_order_" + slug + "_" + token,
        `ozt_last_order_{slug}_{token}`,
      ];

      const orderId =
        keys
          .map((key) =>
            window.localStorage.getItem(key)
          )
          .find(
            (value) =>
              value &&
              /^\d+$/.test(value)
          ) || "";

      if (!orderId) {
        setToast(
          "Bu masa için kayıtlı bir sipariş bulunamadı."
        );
        return;
      }

      router.push(
        `/restoran/${encodeURIComponent(
          slug
        )}/siparis/takip/${encodeURIComponent(
          orderId
        )}?masa=${encodeURIComponent(
          token
        )}`
      );
    } catch {
      setToast(
        "Sipariş takibi şu anda açılamıyor."
      );
    }
  }

  function selectCategory(
    categoryId: number
  ) {
    setActiveCategory(categoryId);

    window.setTimeout(() => {
      document
        .getElementById(
          "nova-menu-list"
        )
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 40);
  }

  if (loading) {
    return (<main className="ozt-nova nova-aurora"><style>{novaAuroraStyles}</style><div className="aurora-state"><div className="aurora-spinner"/><strong>Menü hazırlanıyor</strong><span>Lezzetler birazdan burada.</span></div></main>);
  }
  if (!restaurant) {
    return (<main className="ozt-nova nova-aurora"><style>{novaAuroraStyles}</style><div className="aurora-state"><strong>İşletme bulunamadı.</strong><span>{error}</span></div></main>);
  }
  const tableLabel = tableNumber ? `Masa ${tableNumber}` : "Müşteri Menüsü";
  return (
    <main className="ozt-nova nova-aurora">
      <style>{novaAuroraStyles}</style>
      <div className="aurora-shell">
        <header className="aurora-header">
          <button type="button" className="aurora-brand" onClick={goHome} aria-label="Ana sayfa">
            <span className="aurora-brand-logo">{restaurant.logo_url ? <img src={restaurant.logo_url} alt=""/> : restaurant.name.slice(0,1).toUpperCase()}</span>
            <span className="aurora-brand-copy"><strong>{restaurant.name}</strong><small>{tableLabel}</small></span>
          </button>
          <div className="aurora-header-actions">
            <button type="button" className="aurora-round-button" onClick={() => document.getElementById("aurora-search-input")?.focus()} aria-label="Ara">⌕</button>
            <button type="button" className="aurora-round-button" onClick={() => setServiceOpen(true)} aria-label="Hizmetler">☰</button>
          </div>
        </header>
        <section className="aurora-hero">
          <div className="aurora-hero-image" style={{backgroundImage: restaurant.cover_image_url ? `linear-gradient(180deg, rgba(0,0,0,.04), rgba(0,0,0,.62)), url("${restaurant.cover_image_url}")` : "linear-gradient(145deg,#d8ccba,#7e6a4d)"}} />
          <div className="aurora-hero-content">
            <span className="aurora-eyebrow">DİJİTAL MENÜ</span>
            <h1>{restaurant.name}</h1>
            <p>{restaurant.description || "Lezzetli ürünler, hızlı sipariş ve kolay masa deneyimi."}</p>
            <div className="aurora-hero-meta">
              <span className="is-open">● {restaurant.is_open === false ? "Kapalı" : "Açık"}</span>
              {tableNumber ? <span>⌂ Masa {tableNumber}</span> : null}
              <span>✦ Hızlı &amp; Pratik</span>
            </div>
          </div>
        </section>
        <section className="aurora-welcome">
          <div><span className="aurora-kicker">BUGÜN NE İSTERSİN?</span><h2>Lezzetini keşfet.</h2><p>Menüyü gez, ürünü incele ve siparişini birkaç dokunuşla oluştur.</p></div>
          <button type="button" className="aurora-cart-badge" onClick={() => setCartOpen(true)}><span>🛒</span><strong>{itemCount}</strong><small>ürün</small></button>
        </section>
        <label className="aurora-search"><span>⌕</span><input id="aurora-search-input" type="search" value={search} onChange={(e)=>{setSearch(e.target.value);setActiveCategory(null)}} placeholder="Menüde ürün ara..."/><button type="button" onClick={()=>setSearch("")}>×</button></label>
        {categories.length>0 && <section className="aurora-menu-block"><div className="aurora-category-head"><strong>MENÜ</strong><span>{products.length} ürün</span></div><div className="aurora-category-row"><button type="button" className={activeCategory===null?"aurora-category active":"aurora-category"} onClick={()=>setActiveCategory(null)}>Tümü</button>{categories.map(c=><button type="button" key={c.id} className={activeCategory===c.id?"aurora-category active":"aurora-category"} onClick={()=>selectCategory(c.id)}>{c.name}</button>)}</div></section>}
        {!search.trim() && activeCategory===null && featuredProducts.length>0 && <section className="aurora-section"><div className="aurora-section-title"><div><span className="aurora-kicker">ÖNE ÇIKANLAR</span><h2>Favoriler</h2></div><span>→</span></div><div className="aurora-featured-row">{featuredProducts.map(p=><article key={p.id} className="aurora-featured-card"><ProductCard product={{id:p.id,name:p.name,description:p.description,ingredients:p.ingredients||null,allergens:p.allergens||null,price:Number(p.price),image_url:p.image_url}}/></article>)}</div></section>}
        <section className="aurora-section aurora-products-section" id="aurora-all-products">
          {(activeCategory===null && !search.trim() ? categories : categories.filter(c=>activeCategory===null || c.id===activeCategory)).map(category=>{
            const categoryProducts=products.filter(p=>p.category_id===category.id); if(!categoryProducts.length)return null;
            return <section className="aurora-category-section" key={category.id} id={`aurora-category-${category.id}`}><div className="aurora-category-heading"><div><span>{categoryProducts.length} ürün</span><h2>{category.name}</h2></div></div><div className="aurora-product-list">{categoryProducts.map(p=><article className="aurora-product-row" key={p.id}><ProductCard product={{id:p.id,name:p.name,description:p.description,ingredients:p.ingredients||null,allergens:p.allergens||null,price:Number(p.price),image_url:p.image_url}}/></article>)}</div></section>
          })}
          {(search.trim() || activeCategory!==null) && filteredProducts.length===0 ? <div className="aurora-empty-products"><strong>Ürün bulunamadı.</strong><span>Aramanızı veya kategori seçiminizi değiştirin.</span></div> : null}
        </section>
        <footer className="aurora-footer"><strong>{restaurant.name}</strong><span>OZT DIGITAL MENU</span></footer>
      </div>
      <nav className="aurora-bottom-nav"><button className="active" type="button" onClick={()=>window.scrollTo({top:0,behavior:"smooth"})}><span>▦</span>Menü</button><button type="button" onClick={openLastOrder}><span>◷</span>Siparişlerim</button><button type="button" onClick={()=>setCartOpen(true)}><span className="aurora-cart-icon">🛒{itemCount>0?<b>{itemCount}</b>:null}</span>Sepet</button><button type="button" onClick={()=>setServiceOpen(true)}><span>♧</span>Hizmet</button><button type="button" onClick={openBill}><span>▤</span>Hesap</button></nav>
      {toast ? <div className="aurora-toast"><span>✓</span>{toast}</div> : null}
      {cartOpen ? <div className="aurora-overlay" onClick={()=>setCartOpen(false)}><section className="aurora-sheet" onClick={e=>e.stopPropagation()}><div className="aurora-sheet-handle"/><div className="aurora-sheet-header"><div><span className="aurora-kicker">SEPET</span><h2>Sepetim</h2><small>{itemCount} ürün · {formatPrice(total)}</small></div><button type="button" onClick={()=>setCartOpen(false)}>×</button></div>{items.length===0?<div className="aurora-empty-cart"><div>🛒</div><strong>Sepetiniz boş</strong><span>Menüden ürün seçerek siparişinizi oluşturmaya başlayın.</span><button type="button" onClick={()=>setCartOpen(false)}>Menüye Dön</button></div>:<><div className="aurora-cart-list">{items.map(item=><article className="aurora-cart-item" key={item.id}><div className="aurora-cart-image">{item.image_url?<img src={item.image_url} alt=""/>:<span>🍽️</span>}</div><div className="aurora-cart-info"><strong>{item.name}</strong><span>{formatPrice(Number(item.price))}</span><div className="aurora-cart-qty"><button type="button" onClick={()=>decreaseQuantity(item.id)}>−</button><b>{item.quantity}</b><button type="button" onClick={()=>increaseQuantity(item.id)}>+</button><button type="button" className="remove" onClick={()=>removeFromCart(item.id)}>Sil</button></div></div><strong className="aurora-cart-total">{formatPrice(Number(item.price)*item.quantity)}</strong></article>)}</div><div className="aurora-grand-total"><span>Toplam</span><strong>{formatPrice(total)}</strong></div><button type="button" className="aurora-primary-button" onClick={goToOrder}>Siparişi Tamamla <span>→</span></button></>}</section></div> : null}
      {serviceOpen ? <div className="aurora-overlay" onClick={()=>setServiceOpen(false)}><section className="aurora-sheet" onClick={e=>e.stopPropagation()}><div className="aurora-sheet-handle"/><div className="aurora-sheet-header"><div><span className="aurora-kicker">HİZMET</span><h2>Size nasıl yardımcı olabiliriz?</h2><small>{tableNumber?`Masa ${tableNumber}`:"Masa bağlantısı yok"}</small></div><button type="button" onClick={()=>setServiceOpen(false)}>×</button></div>{tableToken?<div className="aurora-service-list"><form action={callNovaWaiter}><input type="hidden" name="slug" value={slug}/><input type="hidden" name="masa" value={tableToken}/><button type="submit" className="aurora-service-card"><span>🛎️</span><div><strong>Garson Çağır</strong><small>Masanıza garson yönlendirin.</small></div><b>›</b></button></form><form action={requestNovaBill}><input type="hidden" name="slug" value={slug}/><input type="hidden" name="masa" value={tableToken}/><button type="submit" className="aurora-service-card featured"><span>🧾</span><div><strong>Hesap İste</strong><small>Hesabınızı masanıza getirelim.</small></div><b>›</b></button></form><button type="button" className="aurora-service-card" onClick={()=>{setServiceOpen(false);openBill()}}><span>₺</span><div><strong>Masa Hesabını Gör</strong><small>Güncel hesabınızı açın.</small></div><b>›</b></button><button type="button" className="aurora-service-card" onClick={()=>{setServiceOpen(false);openLastOrder()}}><span>◷</span><div><strong>Siparişlerim</strong><small>Son siparişinizi açın.</small></div><b>›</b></button></div>:<div className="aurora-no-table">QR/NFC masa bağlantısı bulunamadı.</div>}</section></div>:null}
    </main>
  );
}
const novaAuroraStyles = `.nova-aurora{min-height:100vh;padding:0 0 105px;background:linear-gradient(180deg,#f8f4ec,#ece5da);color:#181613}.aurora-shell{width:min(100%,520px);margin:0 auto}.aurora-header{position:sticky;top:0;z-index:40;min-height:64px;padding:10px 14px;display:flex;align-items:center;justify-content:space-between;gap:10px;background:rgba(248,244,236,.9);border-bottom:1px solid rgba(70,55,38,.08);backdrop-filter:blur(16px)}.aurora-brand{min-width:0;padding:0;border:0;background:none;display:flex;align-items:center;gap:9px;color:inherit;text-align:left}.aurora-brand-logo{width:38px;height:38px;flex:0 0 38px;display:grid;place-items:center;overflow:hidden;border-radius:12px;background:#171717;border:1px solid rgba(176,137,67,.25);color:#dfbd78;font-size:12px;font-weight:950}.aurora-brand-logo img{width:100%;height:100%;object-fit:contain;padding:4px}.aurora-brand-copy{min-width:0;display:grid;gap:2px}.aurora-brand-copy strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;font-weight:950}.aurora-brand-copy small{color:#8b8175;font-size:8px}.aurora-header-actions{display:flex;gap:7px}.aurora-round-button{width:38px;height:38px;border-radius:12px;border:1px solid rgba(79,63,42,.1);background:rgba(255,255,255,.8);color:#2f2922;font-size:18px}.aurora-hero{position:relative;margin:10px;min-height:350px;overflow:hidden;border-radius:26px;background:#1b1712;box-shadow:0 18px 44px rgba(59,44,26,.16)}.aurora-hero-image{position:absolute;inset:0;background-position:center;background-size:cover}.aurora-hero-content{position:relative;min-height:350px;padding:20px 18px 18px;display:flex;flex-direction:column;justify-content:flex-end;color:#fff}.aurora-eyebrow{color:#e5c386;font-size:8px;font-weight:950;letter-spacing:2px}.aurora-hero-content h1{margin:6px 0 0;font-size:clamp(31px,8vw,46px);line-height:1;letter-spacing:-1px;font-weight:950}.aurora-hero-content p{max-width:340px;margin:9px 0 0;color:rgba(255,255,255,.82);font-size:10px;line-height:1.45}.aurora-hero-meta{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px}.aurora-hero-meta span{padding:7px 9px;border-radius:999px;border:1px solid rgba(255,255,255,.14);background:rgba(11,10,9,.42);font-size:8px;font-weight:900}.aurora-hero-meta .is-open{color:#dff2e0}.aurora-welcome{padding:10px 18px 0;display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.aurora-kicker{display:block;margin-bottom:5px;color:#a47530;font-size:8px;letter-spacing:2px;font-weight:950}.aurora-welcome h2,.aurora-section-title h2,.aurora-category-heading h2,.aurora-sheet h2{margin:0;font-family:Georgia,"Times New Roman",serif;letter-spacing:-.5px}.aurora-welcome h2{font-size:29px;line-height:1}.aurora-welcome p{max-width:340px;margin:7px 0 0;color:#80766b;font-size:10px;line-height:1.45}.aurora-cart-badge{min-width:68px;padding:9px;border-radius:15px;border:1px solid rgba(73,58,39,.1);background:rgba(255,255,255,.84);box-shadow:0 8px 20px rgba(70,55,35,.07);display:grid;grid-template-columns:1fr auto;align-items:center;cursor:pointer}.aurora-cart-badge span{grid-row:span 2;font-size:16px}.aurora-cart-badge strong{font-size:11px}.aurora-cart-badge small{color:#8b8176;font-size:7px}.aurora-search{margin:14px 18px 0;min-height:48px;padding:0 14px;display:flex;align-items:center;gap:8px;border-radius:15px;background:#fffdf9;border:1px solid rgba(78,60,38,.09);box-shadow:0 9px 20px rgba(76,58,33,.05)}.aurora-search>span{color:#a87836;font-size:17px}.aurora-search input{flex:1;min-width:0;border:0;outline:0;background:transparent;color:#252019;font-size:11px}.aurora-search button{width:24px;height:24px;border:0;border-radius:50%;background:#eee7dc;color:#5e554c}.aurora-menu-block{margin-top:15px;padding:0 18px}.aurora-category-head{display:flex;justify-content:space-between;align-items:end;padding-bottom:8px}.aurora-category-head strong{font-size:14px;font-weight:950}.aurora-category-head span{color:#968b7f;font-size:8px}.aurora-category-row{display:flex;gap:7px;overflow-x:auto;scrollbar-width:none}.aurora-category-row::-webkit-scrollbar{display:none}.aurora-category{flex:0 0 auto;min-height:38px;padding:0 13px;border-radius:999px;border:1px solid rgba(82,63,37,.09);background:#fffdfa;color:#766d63;font-size:8px;font-weight:900;white-space:nowrap}.aurora-category.active{background:#191511;color:#f3e8d7;border-color:#191511}.aurora-section{margin-top:23px;padding:0 10px}.aurora-section-title{padding:0 9px;display:flex;align-items:end;justify-content:space-between;margin-bottom:10px}.aurora-section-title h2{font-size:24px;line-height:1}.aurora-featured-row{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.aurora-featured-card{overflow:hidden;border-radius:18px;background:#fffdf9;border:1px solid rgba(72,55,35,.09);box-shadow:0 10px 23px rgba(70,53,31,.06)}.aurora-featured-card .customer-product{display:flex!important;flex-direction:column!important;min-height:0!important;background:transparent!important;border:0!important;box-shadow:none!important}.aurora-featured-card .customer-product-image-wrap{height:132px!important;min-height:132px!important;border:0!important;border-radius:0!important}.aurora-featured-card .customer-product-info{padding:10px 11px 6px!important}.aurora-featured-card .customer-product-info h3{color:#211d18!important;font-size:13px!important}.aurora-featured-card .customer-product-info p{color:#887e72!important;font-size:8px!important}.aurora-featured-card .customer-product-price{padding:0 11px 11px!important;color:#a6762d!important;font-size:14px!important}.aurora-featured-card .customer-product-right{right:8px!important;bottom:8px!important}.aurora-featured-card .add-to-cart-button{width:32px!important;height:32px!important;min-width:32px!important;border-radius:50%!important;background:#b98b42!important}.aurora-products-section{margin-top:25px}.aurora-category-section{margin-top:24px;scroll-margin-top:75px}.aurora-category-heading{padding:0 10px 10px}.aurora-category-heading span{display:block;color:#a07a48;font-size:8px;font-weight:900}.aurora-category-heading h2{margin-top:3px;font-size:27px;line-height:.95}.aurora-product-list{display:grid;gap:8px}.aurora-product-row{overflow:hidden;border-radius:16px;background:#fffdf9;border:1px solid rgba(78,59,37,.09);box-shadow:0 8px 18px rgba(71,54,32,.045)}.aurora-product-row .customer-product{min-height:92px!important;display:grid!important;grid-template-columns:82px minmax(0,1fr)!important;align-items:center!important;gap:10px!important;padding:6px!important;background:transparent!important;border:0!important;box-shadow:none!important}.aurora-product-row .customer-product-image-wrap{width:82px!important;height:82px!important;min-height:82px!important;border:0!important;border-radius:12px!important}.aurora-product-row .customer-product-info{min-width:0!important;padding:0!important}.aurora-product-row .customer-product-info h3{color:#201c17!important;font-size:13px!important;line-height:1.05!important}.aurora-product-row .customer-product-info p{margin-top:4px!important;color:#837a70!important;font-size:8px!important;line-height:1.28!important;-webkit-line-clamp:2!important}.aurora-product-row .customer-product-price{margin-top:6px!important;color:#a6722b!important;font-size:13px!important}.aurora-product-row .customer-product-right{right:7px!important;bottom:7px!important}.aurora-product-row .add-to-cart-button{width:31px!important;height:31px!important;min-width:31px!important;border-radius:50%!important;border:0!important;background:#b9893e!important}.aurora-empty-products{padding:28px;text-align:center;border-radius:18px;background:#fffdf9;border:1px dashed rgba(81,63,40,.13)}.aurora-empty-products strong{display:block;font-size:14px}.aurora-empty-products span{display:block;margin-top:5px;color:#887e73;font-size:9px}.aurora-footer{padding:30px 18px 8px;text-align:center;color:#94897d;display:grid;gap:3px}.aurora-footer strong{font-size:8px;letter-spacing:1.5px}.aurora-footer span{font-size:7px}.aurora-bottom-nav{position:fixed;left:50%;bottom:8px;z-index:90;transform:translateX(-50%);width:min(calc(100% - 18px),520px);min-height:65px;padding:5px;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:3px;border-radius:21px;border:1px solid rgba(75,57,35,.12);background:rgba(255,252,247,.93);box-shadow:0 18px 40px rgba(61,45,26,.15),inset 0 1px 0 rgba(255,255,255,.95);backdrop-filter:blur(16px)}.aurora-bottom-nav button{border:0;border-radius:15px;background:transparent;color:#81776d;display:grid;place-items:center;align-content:center;gap:3px;font-size:7px;font-weight:900}.aurora-bottom-nav button.active{background:#191612;color:#f2e8d7}.aurora-bottom-nav button>span{font-size:16px}.aurora-cart-icon{position:relative}.aurora-cart-icon b{position:absolute;top:-7px;right:-8px;min-width:15px;height:15px;padding:0 3px;display:grid;place-items:center;border-radius:999px;border:2px solid #fffdf8;background:#c69b55;color:#24190c;font-size:7px}.aurora-overlay{position:fixed;inset:0;z-index:120;display:flex;align-items:flex-end;justify-content:center;padding:10px;background:rgba(16,13,10,.45);backdrop-filter:blur(6px)}.aurora-sheet{width:min(100%,520px);max-height:88dvh;overflow-y:auto;padding:8px 14px 17px;border-radius:26px 26px 18px 18px;border:1px solid rgba(80,62,40,.1);background:#fffdf9;box-shadow:0 30px 80px rgba(43,32,20,.25)}.aurora-sheet-handle{width:43px;height:4px;margin:1px auto 13px;border-radius:999px;background:#dbd2c6}.aurora-sheet-header{padding:0 1px 12px;display:flex;justify-content:space-between;align-items:flex-start;gap:10px}.aurora-sheet-header h2{font-size:25px;line-height:1}.aurora-sheet-header small{display:block;margin-top:5px;color:#8a7f73;font-size:8px}.aurora-sheet-header>button{width:36px;height:36px;border:0;border-radius:50%;background:#eee7dd;color:#5f574e;font-size:21px}.aurora-cart-list,.aurora-service-list{display:grid;gap:8px}.aurora-cart-item{display:grid;grid-template-columns:60px minmax(0,1fr) auto;gap:8px;align-items:center;padding:6px;border-radius:15px;background:#f5efe6;border:1px solid rgba(84,65,42,.07)}.aurora-cart-image,.aurora-cart-image img{width:60px;height:60px;border-radius:12px}.aurora-cart-image{overflow:hidden;display:grid;place-items:center;background:#e9e0d4}.aurora-cart-image img{object-fit:cover}.aurora-cart-info{min-width:0}.aurora-cart-info strong{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:10px}.aurora-cart-info>span{display:block;margin-top:3px;color:#a2702c;font-size:8px;font-weight:900}.aurora-cart-qty{margin-top:6px;display:flex;align-items:center;gap:4px}.aurora-cart-qty button{min-width:25px;height:25px;padding:0 5px;border:1px solid rgba(84,66,43,.1);border-radius:8px;background:#fffdf9;color:#554c43;font-size:10px}.aurora-cart-qty b{min-width:18px;text-align:center;font-size:9px}.aurora-cart-qty .remove{margin-left:2px;color:#a8544c;background:#fff5f3}.aurora-cart-total{font-size:9px}.aurora-grand-total{margin-top:13px;padding:13px 2px;display:flex;justify-content:space-between;border-top:1px solid rgba(80,61,39,.1)}.aurora-grand-total span{color:#776e64;font-size:9px}.aurora-grand-total strong{font-size:16px}.aurora-primary-button{width:100%;min-height:52px;border:0;border-radius:15px;background:#b98a43;color:#fff;font-size:13px;font-weight:950}.aurora-empty-cart{text-align:center;padding:28px 18px}.aurora-empty-cart>div{font-size:38px}.aurora-empty-cart strong{display:block;font-size:14px}.aurora-empty-cart span{display:block;margin-top:5px;color:#887e73;font-size:9px}.aurora-empty-cart button{margin-top:10px;min-height:40px;padding:0 14px;border:1px solid rgba(84,65,42,.1);border-radius:12px;background:#f2e8da;color:#5f5448;font-size:9px;font-weight:900}.aurora-service-card{width:100%;min-height:76px;padding:11px;display:grid;grid-template-columns:42px minmax(0,1fr) 20px;align-items:center;gap:9px;border:1px solid rgba(81,62,39,.1);border-radius:18px;background:#faf7f1;color:#281f17;text-align:left}.aurora-service-card.featured{background:#d9b66c}.aurora-service-card>span{width:42px;height:42px;display:grid;place-items:center;border-radius:13px;background:#f0e7da;font-size:18px}.aurora-service-card.featured>span{background:rgba(255,255,255,.28)}.aurora-service-card strong{display:block;font-size:11px;font-weight:950}.aurora-service-card small{display:block;margin-top:3px;color:#8a7e72;font-size:8px;line-height:1.3}.aurora-service-card.featured small{color:#5f4824}.aurora-service-card>b{color:#957441;font-size:22px}.aurora-no-table{padding:28px;text-align:center;color:#7d7368;font-size:10px}.aurora-toast{position:fixed;left:50%;bottom:86px;z-index:160;transform:translateX(-50%);width:min(calc(100% - 22px),460px);min-height:42px;padding:0 12px;display:flex;align-items:center;justify-content:center;gap:7px;border-radius:14px;background:#191613;color:#f6ead7;box-shadow:0 14px 35px rgba(29,22,14,.25);font-size:9px;font-weight:900;text-align:center}.aurora-toast span{color:#c6df74;font-size:14px}.aurora-state{min-height:100vh;display:grid;place-items:center;align-content:center;gap:6px;padding:25px;text-align:center;color:#756b60}.aurora-spinner{width:28px;height:28px;border-radius:50%;border:3px solid #e0d6c8;border-top-color:#b98a43;animation:aurora-spin .8s linear infinite}@keyframes aurora-spin{to{transform:rotate(360deg)}}
`;
