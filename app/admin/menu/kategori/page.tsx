import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "../../../../lib/supabase-server";
import AdminIcon from "../../AdminIcon";
import { CategoryMoveButton } from "../CategoryMoveButton";
import CategoryDeleteButton from "./CategoryDeleteButton";

// Kategori yönetimi: liste, sıralama, düzenleme, silme ve hızlı ekleme.

async function createCategory(formData: FormData) {
  "use server";

  const name = formData.get("name")?.toString().trim();
  if (!name) return;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/admin/login");

  const { data: membership } = await supabase
    .from("restaurant_users")
    .select("restaurant_id")
    .eq("user_id", user.id)
    .single();

  if (!membership) return;

  // Yeni kategori listenin sonuna eklenir.
  const { data: last } = await supabase
    .from("categories")
    .select("sort_order")
    .eq("restaurant_id", membership.restaurant_id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("categories").insert({
    restaurant_id: membership.restaurant_id,
    name,
    sort_order: Number(last?.sort_order ?? 0) + 1,
  });

  if (error) {
    console.error("KATEGORİ EKLEME HATASI:", error);
    throw new Error(error.message);
  }

  revalidatePath("/admin/menu");
  revalidatePath("/admin/menu/kategori");
  redirect("/admin/menu/kategori");
}

export default async function CategoriesPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/admin/login");

  const { data: membership } = await supabase
    .from("restaurant_users")
    .select("restaurant_id")
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    return (
      <main className="adm-page">
        <div className="adm-empty">
          <strong>İşletme bağlantısı bulunamadı</strong>
        </div>
      </main>
    );
  }

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, sort_order")
    .eq("restaurant_id", membership.restaurant_id)
    .order("sort_order", { ascending: true });

  const list = categories ?? [];
  const categoryIds = list.map((category) => category.id);

  const { data: products } =
    categoryIds.length > 0
      ? await supabase.from("products").select("id, category_id, is_available").in("category_id", categoryIds)
      : { data: [] as { id: number; category_id: number; is_available: boolean | null }[] };

  const countFor = (categoryId: number) =>
    (products ?? []).filter((product) => product.category_id === categoryId).length;

  return (
    <main className="adm-page">
      <header className="adm-head">
        <div className="adm-head-text">
          <span className="adm-eyebrow">Menü</span>
          <h1>Kategoriler</h1>
          <p>Kategoriler müşteri menüsünde bu sırayla görünür. Okla yukarı-aşağı taşıyın.</p>
        </div>
        <div className="adm-head-actions">
          <Link className="adm-btn" href="/admin/menu">
            <AdminIcon name="menu" size={16} />
            Ürünler
          </Link>
        </div>
      </header>

      <div className="adm-split">
        <section className="adm-card" aria-labelledby="kategori-listesi">
          <div className="adm-card-head">
            <div>
              <h2 id="kategori-listesi">Menü sırası</h2>
              <p>{list.length} kategori · {(products ?? []).length} ürün</p>
            </div>
          </div>

          {list.length === 0 ? (
            <div className="adm-empty">
              <span className="adm-empty-icon"><AdminIcon name="category" /></span>
              <strong>Henüz kategori yok</strong>
              <p>Sağdaki formdan ilk kategorinizi ekleyin.</p>
            </div>
          ) : (
            <ol className="adm-list adm-cat-list">
              {list.map((category, index) => {
                const previous = list[index - 1];
                const next = list[index + 1];
                const count = countFor(category.id);

                return (
                  <li key={category.id} className="adm-row">
                    <span className="adm-cat-order">{index + 1}</span>
                    <span className="adm-row-main">
                      <strong>{category.name}</strong>
                      <small>{count === 0 ? "Ürün yok" : `${count} ürün`}</small>
                    </span>
                    <span className="adm-product-actions">
                      <CategoryMoveButton
                        categoryId={category.id}
                        direction="up"
                        currentOrder={category.sort_order}
                        neighborId={previous?.id}
                        neighborOrder={previous?.sort_order}
                      />
                      <CategoryMoveButton
                        categoryId={category.id}
                        direction="down"
                        currentOrder={category.sort_order}
                        neighborId={next?.id}
                        neighborOrder={next?.sort_order}
                      />
                      <Link
                        className="adm-btn adm-btn-sm"
                        href={`/admin/menu/kategori/duzenle?id=${category.id}`}
                      >
                        <AdminIcon name="edit" size={15} />
                        Düzenle
                      </Link>
                      <CategoryDeleteButton categoryId={category.id} />
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        <section className="adm-card" aria-labelledby="kategori-ekle">
          <div className="adm-card-head">
            <div>
              <h2 id="kategori-ekle">Yeni kategori</h2>
              <p>Listenin sonuna eklenir.</p>
            </div>
          </div>
          <form action={createCategory} className="adm-form">
            <div className="adm-field">
              <label className="adm-label" htmlFor="kategori-adi">Kategori adı</label>
              <input
                id="kategori-adi"
                className="adm-input"
                type="text"
                name="name"
                placeholder="Örn. Tatlılar"
                maxLength={60}
                required
              />
            </div>
            <button type="submit" className="adm-btn adm-btn-primary">
              <AdminIcon name="plus" size={16} />
              Kategori ekle
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
