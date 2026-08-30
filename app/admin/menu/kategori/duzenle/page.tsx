import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "../../../../../lib/supabase-server";

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

    redirect("/admin/menu");
  }

  return (
    <main className="admin-page">
      <section className="admin-header">
        <a href="/admin/menu">← Menü Yönetimi</a>

        <h1>Kategori Düzenle</h1>

        <p>Kategori adını değiştirebilirsiniz.</p>
      </section>

      <section className="admin-form">
        <form action={updateCategory}>
          <label>
            Kategori Adı
            <input
              type="text"
              name="name"
              defaultValue={category.name}
              required
            />
          </label>

          <button type="submit">
            Değişiklikleri Kaydet
          </button>
        </form>
      </section>
    </main>
  );
}