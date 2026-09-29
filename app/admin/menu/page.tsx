import { createSupabaseServerClient } from "../../../lib/supabase-server";
import ProductDeleteButton from "./ProductDeleteButton";
import Link from "next/link";
import ProductMoveButton from "./ProductMoveButton";
import AdminIcon from "../AdminIcon";

export default async function AdminMenuPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <main className="adm-page"><p className="adm-empty">Oturum bulunamadı.</p></main>;
  }

  /* =====================================================
     RESTORAN ÜYELİĞİ
     ===================================================== */

  const { data: membership } = await supabase
    .from("restaurant_users")
    .select("restaurant_id")
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    return <main className="adm-page"><p className="adm-empty">İşletme bağlantısı bulunamadı.</p></main>;
  }

  /* =====================================================
     KATEGORİLER
     ===================================================== */

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, sort_order")
    .eq("restaurant_id", membership.restaurant_id)
    .order("sort_order", { ascending: true });

  const categoryIds =
    categories?.map((category) => category.id) || [];

  /* =====================================================
     ÜRÜNLER
     ===================================================== */

  const { data: products } =
    categoryIds.length > 0
      ? await supabase
          .from("products")
          .select(
            "id, category_id, name, description, price, image_url, ingredients, allergens, is_available, sort_order"
          )
          .in("category_id", categoryIds)
          .order("sort_order", { ascending: true })
      : { data: [] };

  /* =====================================================
     EKRAN
     ===================================================== */

  const productList = products ?? [];
  const publishedCount = productList.filter((product) => product.is_available !== false).length;

  return (
    <main className="adm-page">
      <header className="adm-head">
        <div className="adm-head-text">
          <span className="adm-eyebrow">Menü</span>
          <h1>Ürünler</h1>
          <p>Ürünleri kategori içinde sıralayın, fiyatını ve görünürlüğünü yönetin.</p>
        </div>
        <div className="adm-head-actions">
          <Link className="adm-btn" href="/admin/menu/ice-aktar">
            <AdminIcon name="sparkle" size={16} />
            Fotoğraftan aktar
          </Link>
          <Link className="adm-btn" href="/admin/menu/kategori">
            <AdminIcon name="category" size={16} />
            Kategoriler
          </Link>
          <Link className="adm-btn adm-btn-primary" href="/admin/menu/yeni">
            <AdminIcon name="plus" size={16} />
            Yeni ürün
          </Link>
        </div>
      </header>

      <section className="adm-stats" aria-label="Menü özeti">
        <div className="adm-stat">
          <div className="adm-stat-top">
            <span className="adm-stat-label">Kategori</span>
            <span className="adm-stat-icon"><AdminIcon name="category" size={16} /></span>
          </div>
          <span className="adm-stat-value">{categories?.length || 0}</span>
        </div>
        <div className="adm-stat">
          <div className="adm-stat-top">
            <span className="adm-stat-label">Ürün</span>
            <span className="adm-stat-icon"><AdminIcon name="menu" size={16} /></span>
          </div>
          <span className="adm-stat-value">{productList.length}</span>
        </div>
        <div className="adm-stat tone-ok">
          <div className="adm-stat-top">
            <span className="adm-stat-label">Yayında</span>
            <span className="adm-stat-icon"><AdminIcon name="eye" size={16} /></span>
          </div>
          <span className="adm-stat-value">{publishedCount}</span>
        </div>
        <div className="adm-stat tone-done">
          <div className="adm-stat-top">
            <span className="adm-stat-label">Gizli</span>
            <span className="adm-stat-icon"><AdminIcon name="eyeOff" size={16} /></span>
          </div>
          <span className="adm-stat-value">{productList.length - publishedCount}</span>
        </div>
      </section>

      {!categories || categories.length === 0 ? (
        <div className="adm-empty">
          <span className="adm-empty-icon"><AdminIcon name="category" /></span>
          <strong>Henüz kategori yok</strong>
          <p>
            Basılı menünüzün fotoğrafını yükleyerek tüm menüyü tek seferde aktarabilir ya da kategorileri elle
            oluşturabilirsiniz.
          </p>
          <div className="adm-form-actions" style={{ justifyContent: "center", flexWrap: "wrap" }}>
            <Link className="adm-btn adm-btn-primary" href="/admin/menu/ice-aktar">
              <AdminIcon name="sparkle" size={16} />
              Menüyü fotoğraftan aktar
            </Link>
            <Link className="adm-btn" href="/admin/menu/kategori">
              <AdminIcon name="plus" size={16} />
              Elle kategori oluştur
            </Link>
          </div>
        </div>
      ) : (
        <>
          <nav className="adm-chips" aria-label="Kategoriye git">
            {categories.map((category) => (
              <a key={category.id} className="adm-chip" href={`#category-${category.id}`}>
                {category.name}
                <b>{productList.filter((product) => product.category_id === category.id).length}</b>
              </a>
            ))}
          </nav>

          {categories.map((category) => {
            const categoryProducts = productList.filter(
              (product) => product.category_id === category.id
            );

            return (
              <section
                key={category.id}
                id={`category-${category.id}`}
                className="adm-card adm-menu-cat"
                aria-labelledby={`kategori-${category.id}`}
              >
                <div className="adm-card-head">
                  <div>
                    <h2 id={`kategori-${category.id}`}>{category.name}</h2>
                    <p>{categoryProducts.length} ürün</p>
                  </div>
                  <Link
                    className="adm-btn adm-btn-sm adm-btn-ghost"
                    href={`/admin/menu/kategori/duzenle?id=${category.id}`}
                  >
                    <AdminIcon name="edit" size={15} />
                    Kategoriyi düzenle
                  </Link>
                </div>

                {categoryProducts.length === 0 ? (
                  <p className="adm-hint" style={{ margin: 0 }}>
                    Bu kategoride henüz ürün yok.{" "}
                    <Link className="adm-card-link" href="/admin/menu/yeni">Ürün ekle</Link>
                  </p>
                ) : (
                  <div className="adm-list">
                    {categoryProducts.map((product, productIndex) => {
                      const previousProduct = categoryProducts[productIndex - 1];
                      const nextProduct = categoryProducts[productIndex + 1];
                      const hidden = product.is_available === false;

                      return (
                        <div key={product.id} className={`adm-row adm-product ${hidden ? "is-hidden" : ""}`}>
                          <span className="adm-product-thumb">
                            {product.image_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={product.image_url} alt="" loading="lazy" />
                            ) : (
                              <AdminIcon name="image" size={20} />
                            )}
                          </span>

                          <span className="adm-row-main">
                            <strong>
                              {product.name}
                              {hidden && <span className="adm-badge s-delivered">Gizli</span>}
                            </strong>
                            {product.description && <small>{product.description}</small>}
                          </span>

                          <span className="adm-num adm-product-price">
                            {Number(product.price).toLocaleString("tr-TR")} ₺
                          </span>

                          <span className="adm-product-actions">
                            <ProductMoveButton
                              productId={product.id}
                              direction="up"
                              currentOrder={product.sort_order}
                              neighborId={previousProduct?.id}
                              neighborOrder={previousProduct?.sort_order}
                            />
                            <ProductMoveButton
                              productId={product.id}
                              direction="down"
                              currentOrder={product.sort_order}
                              neighborId={nextProduct?.id}
                              neighborOrder={nextProduct?.sort_order}
                            />
                            <Link
                              className="adm-btn adm-btn-sm"
                              href={`/admin/menu/duzenle?id=${product.id}`}
                            >
                              <AdminIcon name="edit" size={15} />
                              Düzenle
                            </Link>
                            <ProductDeleteButton productId={product.id} />
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </>
      )}
    </main>
  );
}
