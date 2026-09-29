import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminRestaurant } from "../../../../lib/admin-restaurant";
import { aiConfigured } from "../../../../lib/ai";
import AdminIcon from "../../AdminIcon";
import MenuImporter from "./MenuImporter";

// Menü okuma bir yapay zekâ isteğidir; varsayılan süre yetmeyebilir.
export const maxDuration = 300;

export default async function MenuImportPage() {
  const admin = await getAdminRestaurant();
  if (!admin) redirect("/admin/login");

  const { supabase, restaurantId } = admin;

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name")
    .eq("restaurant_id", restaurantId);

  const categoryList = categories ?? [];
  const categoryIds = categoryList.map((category) => category.id);

  const { data: products } =
    categoryIds.length > 0
      ? await supabase.from("products").select("category_id, name").in("category_id", categoryIds)
      : { data: [] as { category_id: number; name: string }[] };

  const categoryName = new Map(categoryList.map((category) => [category.id, category.name]));
  const existingProducts = (products ?? []).map(
    (product) =>
      `${(categoryName.get(product.category_id) ?? "").trim().toLocaleLowerCase("tr-TR")}|${product.name
        .trim()
        .toLocaleLowerCase("tr-TR")}`
  );

  return (
    <main className="adm-page">
      <header className="adm-head">
        <div className="adm-head-text">
          <span className="adm-eyebrow">Menü</span>
          <h1>Menüyü fotoğraftan aktar</h1>
          <p>
            Basılı menünüzün fotoğrafını ya da PDF&apos;ini yükleyin; kategoriler, ürünler ve fiyatlar otomatik
            çıkarılsın. Eklemeden önce hepsini kontrol edip düzeltebilirsiniz.
          </p>
        </div>
        <div className="adm-head-actions">
          <Link className="adm-btn" href="/admin/menu">
            <AdminIcon name="menu" size={16} />
            Ürünler
          </Link>
        </div>
      </header>

      <MenuImporter
        aiReady={aiConfigured()}
        existingCategories={categoryList.map((category) => category.name)}
        existingProducts={existingProducts}
      />
    </main>
  );
}
