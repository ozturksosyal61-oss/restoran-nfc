import Link from "next/link";
import { hasPlanFeature } from "../../../../lib/plan";
import { readRestaurantPlan } from "../../../../lib/plan-server";
import PlanLock from "../../PlanLock";
import { redirect } from "next/navigation";
import { getAdminRestaurant } from "../../../../lib/admin-restaurant";
import { aiConfigured } from "../../../../lib/ai";
import AdminIcon from "../../AdminIcon";
import { CalorieRow, EstimateControls } from "./CalorieForms";

// Tahmin birkaç yapay zekâ isteği yapar; varsayılan süre yetmeyebilir.
export const maxDuration = 300;

type Product = {
  id: number;
  category_id: number;
  name: string;
  description: string | null;
  calories?: number | null;
  calories_source?: string | null;
};

export default async function CaloriesPage() {
  const admin = await getAdminRestaurant();
  if (!admin) redirect("/admin/login");

  const { supabase, restaurantId } = admin;

  if (!hasPlanFeature(await readRestaurantPlan(supabase, Number(restaurantId)), "calories")) {
    return <PlanLock feature="calories" title="Kalori bilgileri" eyebrow="Menü" />;
  }

  const { data: categoryData } = await supabase
    .from("categories")
    .select("id, name, sort_order")
    .eq("restaurant_id", restaurantId)
    .order("sort_order", { ascending: true });

  const categories = categoryData ?? [];
  const categoryIds = categories.map((category) => category.id);

  let products: Product[] = [];
  let columnMissing = false;

  if (categoryIds.length > 0) {
    const { data: productData } = await supabase
      .from("products")
      .select("id, category_id, name, description, sort_order")
      .in("category_id", categoryIds)
      .order("sort_order", { ascending: true });

    products = (productData ?? []) as Product[];

    // Kalori sütunları ayrı okunur; veritabanı güncellenmemişse sayfa yine açılır.
    const { data: calorieData, error } = await supabase
      .from("products")
      .select("id, calories, calories_source")
      .in("category_id", categoryIds);

    if (error) {
      columnMissing = true;
    } else {
      const byId = new Map((calorieData ?? []).map((row) => [row.id, row]));
      products.forEach((product) => {
        product.calories = byId.get(product.id)?.calories ?? null;
        product.calories_source = byId.get(product.id)?.calories_source ?? null;
      });
    }
  }

  const total = products.length;
  const filled = products.filter((product) => product.calories != null).length;
  const manual = products.filter((product) => product.calories != null && product.calories_source === "manual").length;
  const estimated = filled - manual;
  const ai = aiConfigured();

  return (
    <main className="adm-page">
      <header className="adm-head">
        <div className="adm-head-text">
          <span className="adm-eyebrow">Menü</span>
          <h1>Kalori bilgileri</h1>
          <p>
            Ürünlerin porsiyon başına yaklaşık kalorisi menüde fiyatın yanında görünür. Tek tek hesaplamanıza gerek
            yok: yapay zekâ ürün adı, açıklaması ve içindekilere bakarak tahmin eder, siz de gerekirse düzeltirsiniz.
          </p>
        </div>
        <div className="adm-head-actions">
          <Link className="adm-btn" href="/admin/menu">
            <AdminIcon name="menu" size={16} />
            Ürünler
          </Link>
        </div>
      </header>

      {columnMissing && (
        <p className="adm-alert adm-alert-error" role="alert">
          <AdminIcon name="alert" size={16} />
          Kalori bilgisi için veritabanı güncellemesi bekleniyor. Lütfen OZT Digital ile iletişime geçin.
        </p>
      )}

      <section className="adm-stats" aria-label="Kalori özeti">
        <div className="adm-stat">
          <div className="adm-stat-top">
            <span className="adm-stat-label">Ürün</span>
            <span className="adm-stat-icon"><AdminIcon name="menu" size={16} /></span>
          </div>
          <span className="adm-stat-value">{total}</span>
        </div>
        <div className={`adm-stat ${filled === total && total > 0 ? "tone-ok" : "tone-new"}`}>
          <div className="adm-stat-top">
            <span className="adm-stat-label">Kalorisi eksik</span>
            <span className="adm-stat-icon"><AdminIcon name="alert" size={16} /></span>
          </div>
          <span className="adm-stat-value">{total - filled}</span>
        </div>
        <div className="adm-stat tone-accent">
          <div className="adm-stat-top">
            <span className="adm-stat-label">Yapay zekâ tahmini</span>
            <span className="adm-stat-icon"><AdminIcon name="sparkle" size={16} /></span>
          </div>
          <span className="adm-stat-value">{estimated}</span>
        </div>
        <div className="adm-stat tone-ok">
          <div className="adm-stat-top">
            <span className="adm-stat-label">Elle girilen</span>
            <span className="adm-stat-icon"><AdminIcon name="check" size={16} /></span>
          </div>
          <span className="adm-stat-value">{manual}</span>
        </div>
      </section>

      <section className="adm-card" aria-labelledby="kalori-tahmin">
        <div className="adm-card-head">
          <div>
            <h2 id="kalori-tahmin">Otomatik tahmin</h2>
            <p>
              Değerler yaklaşıktır ve menüde &quot;yaklaşık&quot; olarak gösterilir. Elle girdiğiniz değerlere yapay
              zekâ hiçbir zaman dokunmaz. Kalorisini göstermek istemediğiniz ürünün kutusunu boşaltıp kaydedin.
            </p>
          </div>
        </div>
        {!ai && (
          <p className="adm-alert adm-alert-info" style={{ margin: 0 }}>
            <AdminIcon name="info" size={16} />
            Otomatik tahmin şu an kapalı. Kalorileri aşağıdan elle girebilirsiniz.
          </p>
        )}
        <EstimateControls disabled={!ai || columnMissing || total === 0} missing={total - filled} aiCount={estimated} />
      </section>

      {total === 0 ? (
        <div className="adm-empty">
          <span className="adm-empty-icon"><AdminIcon name="menu" /></span>
          <strong>Henüz ürün yok</strong>
          <p>Önce menünüze ürün ekleyin.</p>
        </div>
      ) : (
        !columnMissing &&
        categories.map((category) => {
          const items = products.filter((product) => product.category_id === category.id);
          if (items.length === 0) return null;
          return (
            <section key={category.id} className="adm-card" aria-labelledby={`kalori-kat-${category.id}`}>
              <div className="adm-card-head">
                <div>
                  <h2 id={`kalori-kat-${category.id}`}>{category.name}</h2>
                  <p>{items.length} ürün</p>
                </div>
              </div>
              <ul className="adm-cal-list">
                {items.map((product) => (
                  <CalorieRow
                    key={`${product.id}-${product.calories ?? ""}-${product.calories_source ?? ""}`}
                    id={product.id}
                    name={product.name}
                    description={product.description}
                    calories={product.calories ?? null}
                    source={product.calories_source ?? null}
                  />
                ))}
              </ul>
            </section>
          );
        })
      )}
    </main>
  );
}
