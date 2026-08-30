import { createSupabaseServerClient } from "../../../lib/supabase-server";
import ProductDeleteButton from "./ProductDeleteButton";
import Link from "next/link";
import CategoryDeleteButton from "./kategori/CategoryDeleteButton";
import { CategoryMoveButton } from "./CategoryMoveButton";
import ProductMoveButton from "./ProductMoveButton";

export default async function AdminMenuPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <p>Oturum bulunamadı.</p>;
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
    return <p>İşletme bağlantısı bulunamadı.</p>;
  }

  /* =====================================================
     RESTORAN
     ===================================================== */

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id, name")
    .eq("id", membership.restaurant_id)
    .single();

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

  return (
    <main className="admin-page">

      {/* =================================================
          HEADER
          ================================================= */}

      <section className="admin-header">

        <a href="/admin">
          ← Admin Paneli
        </a>

        <h1>
          {restaurant?.name} - Menü Yönetimi
        </h1>

        <p>
          Kategorilerinizi ve ürünlerinizi buradan
          yönetebilirsiniz.
        </p>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "8px",
            marginTop: "14px",
          }}
        >
          <span
            style={{
              padding: "7px 10px",
              borderRadius: "999px",
              background: "#fff7df",
              border: "1px solid #ead59a",
              color: "#946b00",
              fontSize: "11px",
              fontWeight: 800,
            }}
          >
            📂 {categories?.length || 0} kategori
          </span>

          <span
            style={{
              padding: "7px 10px",
              borderRadius: "999px",
              background: "#edf5ff",
              border: "1px solid #c8def3",
              color: "#245d91",
              fontSize: "11px",
              fontWeight: 800,
            }}
          >
            🍽️ {products?.length || 0} ürün
          </span>

          <span
            style={{
              padding: "7px 10px",
              borderRadius: "999px",
              background: "#edf9f0",
              border: "1px solid #c8e5cf",
              color: "#26703c",
              fontSize: "11px",
              fontWeight: 800,
            }}
          >
            🟢 {products?.filter((product) => product.is_available !== false).length || 0} yayında
          </span>
        </div>

        {/* BUTONLAR */}

        <div className="menu-actions">

          <Link
            href="/admin/menu/kategori/yeni"
            className="admin-button"
          >
            ➕ Yeni Kategori
          </Link>

          <Link
            href="/admin/menu/yeni"
            className="admin-button"
          >
            ➕ Yeni Ürün
          </Link>

        </div>

        {/* KATEGORİ NAV */}

        <nav className="category-nav">

          {categories?.map((category) => (
            <a
              key={category.id}
              href={`#category-${category.id}`}
            >
              {category.name}
            </a>
          ))}

        </nav>

      </section>

      {/* =================================================
          MENÜ
          ================================================= */}

      <section className="menu">

        {!categories || categories.length === 0 ? (
          <div
            style={{
              maxWidth: "760px",
              margin: "30px auto",
              padding: "45px 24px",
              textAlign: "center",
              background: "#fff",
              border: "1px dashed #d8c8a5",
              borderRadius: "18px",
            }}
          >
            <div
              style={{
                fontSize: "44px",
                marginBottom: "10px",
              }}
            >
              🍽️
            </div>

            <h2
              style={{
                margin: "0 0 8px",
                fontSize: "22px",
              }}
            >
              Henüz menü kategorisi yok
            </h2>

            <p
              style={{
                margin: "0 auto",
                maxWidth: "500px",
                color: "#777",
                fontSize: "13px",
                lineHeight: 1.6,
              }}
            >
              İlk kategorinizi oluşturarak menünüzü
              hazırlamaya başlayabilirsiniz.
            </p>

            <Link
              href="/admin/menu/kategori/yeni"
              className="admin-button"
              style={{
                display: "inline-flex",
                marginTop: "18px",
                textDecoration: "none",
              }}
            >
              ➕ İlk Kategoriyi Oluştur
            </Link>
          </div>
        ) : (
          categories.map((category, categoryIndex) => {

          /* ---------------------------------------------
             BU KATEGORİNİN ÜRÜNLERİ
             --------------------------------------------- */

          const categoryProducts =
            products?.filter(
              (product) =>
                product.category_id === category.id
            ) || [];

          /* ---------------------------------------------
             ÖNCEKİ / SONRAKİ KATEGORİ
             --------------------------------------------- */

          const previousCategory =
            categoryIndex > 0
              ? categories[categoryIndex - 1]
              : undefined;

          const nextCategory =
            categoryIndex < categories.length - 1
              ? categories[categoryIndex + 1]
              : undefined;

          return (
            <div
              key={category.id}
              id={`category-${category.id}`}
              className="admin-menu-category"
            >

              {/* =================================================
                  KATEGORİ BAŞLIK
                  ================================================= */}

              <div className="category-header">

                <h2>
                  {category.name}
                </h2>

                {/* KATEGORİ İŞLEMLERİ */}

                <div className="category-actions">

                  <CategoryMoveButton
                    categoryId={category.id}
                    direction="up"
                    currentOrder={category.sort_order}
                    neighborId={previousCategory?.id}
                    neighborOrder={
                      previousCategory?.sort_order
                    }
                  />

                  <CategoryMoveButton
                    categoryId={category.id}
                    direction="down"
                    currentOrder={category.sort_order}
                    neighborId={nextCategory?.id}
                    neighborOrder={
                      nextCategory?.sort_order
                    }
                  />

                  <Link
                    href={`/admin/menu/kategori/duzenle?id=${category.id}`}
                    className="edit-button"
                  >
                    ✏️ Düzenle
                  </Link>

                  <CategoryDeleteButton
                    categoryId={category.id}
                  />

                </div>

              </div>

              {/* =================================================
                  ÜRÜN YOK
                  ================================================= */}

              {categoryProducts.length === 0 ? (

                <p>
                  Bu kategoride henüz ürün yok.
                </p>

              ) : (

                /* =================================================
                   ÜRÜNLER
                   ================================================= */

                categoryProducts.map(
                  (product, productIndex) => {

                    const previousProduct =
                      productIndex > 0
                        ? categoryProducts[
                            productIndex - 1
                          ]
                        : undefined;

                    const nextProduct =
                      productIndex <
                      categoryProducts.length - 1
                        ? categoryProducts[
                            productIndex + 1
                          ]
                        : undefined;

                    return (
                      <div
                        key={product.id}
                        className={`menu-item ${
                          product.is_available === false
                            ? "product-unavailable"
                            : ""
                        }`}
                      >

                        {/* =================================================
                            FOTOĞRAF
                            ================================================= */}

                        {product.image_url ? (

                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="product-image"
                          />

                        ) : (

                          <div className="product-image-placeholder">
                            🍽️
                          </div>

                        )}

                        {/* =================================================
                            ÜRÜN BİLGİLERİ
                            ================================================= */}

                        <div className="product-info">

                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              flexWrap: "wrap",
                            }}
                          >

                            <h3>
                              {product.name}
                            </h3>

                            {/* DURUM */}

                            {product.is_available ===
                            false ? (

                              <span
                                style={{
                                  display:
                                    "inline-flex",
                                  alignItems:
                                    "center",
                                  padding:
                                    "4px 8px",
                                  borderRadius:
                                    "20px",
                                  background:
                                    "#fee2e2",
                                  color:
                                    "#b91c1c",
                                  fontSize:
                                    "10px",
                                  fontWeight: 800,
                                }}
                              >
                                GİZLİ
                              </span>

                            ) : (

                              <span
                                style={{
                                  display:
                                    "inline-flex",
                                  alignItems:
                                    "center",
                                  padding:
                                    "4px 8px",
                                  borderRadius:
                                    "20px",
                                  background:
                                    "#dcfce7",
                                  color:
                                    "#15803d",
                                  fontSize:
                                    "10px",
                                  fontWeight: 800,
                                }}
                              >
                                YAYINDA
                              </span>

                            )}

                          </div>

                          {/* AÇIKLAMA */}

                          {product.description && (
                            <p>
                              {product.description}
                            </p>
                          )}

                        </div>

                        {/* =================================================
                            FİYAT
                            ================================================= */}

                        <strong className="product-price">

                          {Number(
                            product.price
                          ).toLocaleString("tr-TR")}{" "}

                          TL

                        </strong>

                        {/* =================================================
                            ÜRÜN İŞLEMLERİ
                            ================================================= */}

                        <div
                          style={{
                            display: "flex",
                            gap: "8px",
                            alignItems:
                              "center",
                            flexWrap:
                              "wrap",
                          }}
                        >

                          {/* YUKARI */}

                          <ProductMoveButton
                            productId={
                              product.id
                            }
                            direction="up"
                            currentOrder={
                              product.sort_order
                            }
                            neighborId={
                              previousProduct?.id
                            }
                            neighborOrder={
                              previousProduct?.sort_order
                            }
                          />

                          {/* AŞAĞI */}

                          <ProductMoveButton
                            productId={
                              product.id
                            }
                            direction="down"
                            currentOrder={
                              product.sort_order
                            }
                            neighborId={
                              nextProduct?.id
                            }
                            neighborOrder={
                              nextProduct?.sort_order
                            }
                          />

                          {/* DÜZENLE */}

                          <Link
                            href={`/admin/menu/duzenle?id=${product.id}`}
                            className="edit-button"
                          >
                            ✏️ Düzenle
                          </Link>

                          {/* SİL */}

                          <ProductDeleteButton
                            productId={
                              product.id
                            }
                          />

                        </div>

                      </div>
                    );
                  }
                )

              )}

            </div>
          );
          })
        )}

      </section>

    </main>
  );
}