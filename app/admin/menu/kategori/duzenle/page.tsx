import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "../../../../../lib/supabase-server";
import AdminIcon from "../../../AdminIcon";

export default async function EditCategoryPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;

  if (!id) {
    redirect("/admin/menu");
  }

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const { data: membership } = await supabase
    .from("restaurant_users")
    .select("restaurant_id")
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    return <p>İşletme bağlantısı bulunamadı.</p>;
  }

  const { data: category } = await supabase
    .from("categories")
    .select("id, name, restaurant_id")
    .eq("id", id)
    .eq("restaurant_id", membership.restaurant_id)
    .single();

  if (!category) {
    return <p>Kategori bulunamadı.</p>;
  }

  async function updateCategory(formData: FormData) {
    "use server";

    const name = formData.get("name")?.toString().trim();

    if (!name) {
      return;
    }

    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/admin/login");
    }

    const { data: membership } = await supabase
      .from("restaurant_users")
      .select("restaurant_id")
      .eq("user_id", user.id)
      .single();

    if (!membership) {
      return;
    }

    const { error } = await supabase
      .from("categories")
      .update({
        name,
      })
      .eq("id", id)
      .eq("restaurant_id", membership.restaurant_id);

    if (error) {
      console.error("KATEGORİ GÜNCELLEME HATASI:", error);
      throw new Error(error.message);
    }

    revalidatePath("/admin/menu");
    revalidatePath("/admin/menu/kategori");

    redirect("/admin/menu/kategori");
  }

  return (
    <main className="adm-page" style={{ maxWidth: 640 }}>
      <a className="adm-back" href="/admin/menu/kategori">
        <AdminIcon name="arrowLeft" size={15} />
        Kategoriler
      </a>

      <header className="adm-head">
        <div className="adm-head-text">
          <span className="adm-eyebrow">Menü</span>
          <h1>Kategoriyi düzenle</h1>
          <p>Ad değişikliği müşteri menüsüne hemen yansır.</p>
        </div>
      </header>

      <form action={updateCategory} className="adm-card adm-form">
        <div className="adm-field">
          <label className="adm-label" htmlFor="kategori-ad">Kategori adı</label>
          <input
            id="kategori-ad"
            className="adm-input"
            type="text"
            name="name"
            defaultValue={category.name}
            maxLength={60}
            required
          />
        </div>

        <div className="adm-form-actions">
          <a className="adm-btn" href="/admin/menu/kategori">Vazgeç</a>
          <button type="submit" className="adm-btn adm-btn-primary">
            <AdminIcon name="save" size={16} />
            Kaydet
          </button>
        </div>
      </form>
    </main>
  );
}
