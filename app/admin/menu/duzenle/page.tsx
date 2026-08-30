import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../../../lib/supabase-server";
import EditProductForm from "./EditProductForm";

export default async function EditProductPage({
  searchParams,
}: {
  searchParams: Promise<{
    id?: string;
  }>;
}) {
  const params = await searchParams;

  const productId = params.id;

  if (!productId) {
    notFound();
  }

  const supabase =
    await createSupabaseServerClient();

  // =====================================================
  // OTURUM
  // =====================================================

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  // =====================================================
  // RESTORAN ÜYELİĞİ
  // =====================================================

  const { data: membership } = await supabase
    .from("restaurant_users")
    .select("restaurant_id")
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    return (
      <main className="admin-page">
        <section className="admin-header">
          <h1>İşletme bağlantısı bulunamadı.</h1>
        </section>
      </main>
    );
  }

  const restaurantId =
    membership.restaurant_id;

  // =====================================================
  // KATEGORİLER
  // =====================================================

  const { data: categories } =
    await supabase
      .from("categories")
      .select("id, name")
      .eq(
        "restaurant_id",
        restaurantId
      )
      .order("id");

  if (!categories || categories.length === 0) {
    return (
      <main className="admin-page">
        <section className="admin-header">
          <a href="/admin/menu">
            ← Menü Yönetimi
          </a>

          <h1>
            Önce kategori oluşturun
          </h1>

          <p>
            Ürün düzenleyebilmek için
            restoranınıza ait bir kategori
            bulunmalıdır.
          </p>
        </section>
      </main>
    );
  }

  // =====================================================
  // RESTORANA AİT ÜRÜNÜ BUL
  // =====================================================

  const categoryIds =
    categories.map(
      (category) => category.id
    );

  const {
    data: product,
    error: productError,
  } = await supabase
    .from("products")
    .select(`
      id,
      category_id,
      name,
      description,
      ingredients,
      allergens,
      price,
      image_url,
      is_available
    `)
    .eq(
      "id",
      Number(productId)
    )
    .in(
      "category_id",
      categoryIds
    )
    .single();

  // Ürün bu restorana ait değilse gösterme
  if (
    productError ||
    !product
  ) {
    notFound();
  }

  // =====================================================
  // FORM
  // =====================================================

  return (
    <EditProductForm
      product={product}
      categories={categories}
    />
  );
}