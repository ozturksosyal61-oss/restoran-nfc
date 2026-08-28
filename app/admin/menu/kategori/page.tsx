import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "../../../../lib/supabase-server";

export default async function NewCategoryPage() {
  const supabase = await createServerSupabaseClient();

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

  async function createCategory(formData: FormData) {
    "use server";

    const name = formData.get("name")?.toString().trim();

    if (!name) {
      return;
    }

    const supabase = await createServerSupabaseClient();

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
  .insert({
    restaurant_id: membership.restaurant_id,
    name,
  });

if (error) {
  console.error("KATEGORİ EKLEME HATASI:", error);
  throw new Error(error.message);
}

revalidatePath("/admin/menu");

redirect("/admin/menu");
  }

  return (
    <main className="admin-page">
      <section className="admin-header">
        <a href="/admin/menu">← Menü Yönetimi</a>

        <h1>Yeni Kategori</h1>

        <p>Menünüze yeni bir kategori ekleyin.</p>
      </section>

      <section className="admin-form">
        <form action={createCategory}>
          <label>
            Kategori Adı
            <input
              type="text"
              name="name"
              placeholder="Örn. Tatlılar"
              required
            />
          </label>

          <button type="submit">
            Kategori Ekle
          </button>
        </form>
      </section>
    </main>
  );
}