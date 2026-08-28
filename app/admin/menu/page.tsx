import { createServerSupabaseClient } from "../../../lib/supabase-server";
import ProductDeleteButton from "./ProductDeleteButton";
import Link from "next/link";
import CategoryDeleteButton from "./kategori/CategoryDeleteButton";

export default async function AdminMenuPage() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <p>Oturum bulunamadı.</p>;
  }

  const { data: membership } = await supabase
    .from("restaurant_users")
    .select("restaurant_id")
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    return <p>İşletme bağlantısı bulunamadı.</p>;
  }

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id, name")
    .eq("id", membership.restaurant_id)
    .single();

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name")
    .eq("restaurant_id", membership.restaurant_id)
    .order("id");

  const categoryIds =
    categories?.map((category) => category.id) || [];

  const { data: products } =
    categoryIds.length > 0
      ? await supabase
          .from("products")
          .select(
            "id, category_id, name, description, price, image_url, ingredients, allergens, is_available"
          )
          .in("category_id", categoryIds)
          .order("id")
      : { data: [] };

  return (
    <main className="admin-page">

      {/* HEADER */}
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

      {/* MENÜ */}
      <section className="menu">

        {categories?.map((category) => {

          const categoryProducts =
            products?.filter(
              (product) =>
                product.category_id === category.id
            ) || [];

          return (
            <div
              key={category.id}
              id={`category-${category.id}`}
              className="admin-menu-category"
            >

              {/* KATEGORİ BAŞLIK */}
              <div className="category-header">

                <h2>
                  {category.name}
                </h2>

                <div className="category-actions">

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

              {/* ÜRÜN YOK */}
              {categoryProducts.length === 0 ? (

                <p>
                  Bu kategoride henüz ürün yok.
                </p>

              ) : (

                categoryProducts.map((product) => (

                  <div
                    key={product.id}
                    className={`menu-item ${
                      product.is_available === false
                        ? "product-unavailable"
                        : ""
                    }`}
                  >

                    {/* FOTOĞRAF */}
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

                    {/* BİLGİ */}
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

                        {product.is_available === false ? (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              padding: "4px 8px",
                              borderRadius: "20px",
                              background: "#fee2e2",
                              color: "#b91c1c",
                              fontSize: "10px",
                              fontWeight: 800,
                            }}
                          >
                            GİZLİ
                          </span>
                        ) : (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              padding: "4px 8px",
                              borderRadius: "20px",
                              background: "#dcfce7",
                              color: "#15803d",
                              fontSize: "10px",
                              fontWeight: 800,
                            }}
                          >
                            YAYINDA
                          </span>
                        )}

                      </div>

                      {product.description && (
                        <p>
                          {product.description}
                        </p>
                      )}

                    </div>

                    {/* FİYAT */}
                    <strong className="product-price">
                      {Number(product.price).toLocaleString(
                        "tr-TR"
                      )}{" "}
                      TL
                    </strong>

                    {/* İŞLEMLER */}
                    <div
                      style={{
                        display: "flex",
                        gap: "8px",
                        alignItems: "center",
                        flexWrap: "wrap",
                      }}
                    >

                      <Link
                        href={`/admin/menu/duzenle?id=${product.id}`}
                        className="edit-button"
                      >
                        ✏️ Düzenle
                      </Link>

                      <ProductDeleteButton
                        productId={product.id}
                      />

                    </div>

                  </div>

                ))
              )}

            </div>
          );

        })}

      </section>

    </main>
  );
}