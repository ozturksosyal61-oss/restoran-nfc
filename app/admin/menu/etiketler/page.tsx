import Link from "next/link";
import { createSupabaseServerClient } from "../../../../lib/supabase-server";
import AdminIcon from "../../AdminIcon";
import BulkTagsView, { type BulkProduct } from "./BulkTagsView";

// Toplu etiketleme: bir etiket seçilir, ürünlere dokunarak verilir.
export default async function ProductTagsPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <main className="adm-page"><p className="adm-empty">Oturum bulunamadı.</p></main>;
  }

  const { data: membership } = await supabase
    .from("restaurant_users")
    .select("restaurant_id")
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    return <main className="adm-page"><p className="adm-empty">İşletme bağlantısı bulunamadı.</p></main>;
  }

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, sort_order")
    .eq("restaurant_id", membership.restaurant_id)
    .order("sort_order", { ascending: true });

  const categoryIds = categories?.map((category) => category.id) ?? [];

  const { data: products, error } =
    categoryIds.length > 0
      ? await supabase
          .from("products")
          .select("id, category_id, name, image_url, is_available, sort_order, tags, new_until")
          .in("category_id", categoryIds)
          .order("sort_order", { ascending: true })
      : { data: [], error: null };

  return (
    <main className="adm-page">
      <Link className="adm-back" href="/admin/menu">
        <AdminIcon name="arrowLeft" size={15} />
        Ürünler
      </Link>

      <header className="adm-head">
        <div className="adm-head-text">
          <span className="adm-eyebrow">Menü</span>
          <h1>Ürün etiketleri</h1>
          <p>Bir etiket seçin, sonra o etiketi vermek istediğiniz ürünlere dokunun. Bitince kaydedin.</p>
        </div>
      </header>

      {error ? (
        <p className="adm-alert adm-alert-error" role="alert">
          <AdminIcon name="alert" size={16} />
          Etiketler için veritabanı güncellemesi henüz yapılmamış.
        </p>
      ) : (
        <BulkTagsView
          categories={(categories ?? []).map((category) => ({ id: Number(category.id), name: category.name }))}
          products={(products ?? []) as unknown as BulkProduct[]}
        />
      )}
    </main>
  );
}
