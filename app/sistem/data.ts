import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "../../lib/supabase-admin";

// Sistem sahibi sayfalarının ortak veri yükleyicileri. Yalnızca sunucu
// bileşenlerinden çağrılır (service role kullanır); çağıran sayfa
// requireSystemAdmin() ile yetkiyi önceden doğrulamış olmalıdır.

export type SystemRestaurant = {
  id: number;
  name: string;
  slug: string;
  theme: string | null;
  is_active: boolean;
  logo_url: string | null;
  plan: string | null;
  menu_only: boolean;
};

export type SystemPlan = {
  id: string;
  name: string;
  slug: string;
  monthly_price: number;
  yearly_price: number;
};

export type SystemSubscription = {
  id: string;
  restaurant_id: number;
  plan_id: string;
  status: string;
  billing_interval: string;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancelled_at: string | null;
  subscription_plans: {
    id: string;
    name: string;
    slug: string;
    monthly_price: number;
    yearly_price: number;
  } | null;
};

export type SystemManager = {
  id: number;
  user_id: string;
  restaurant_id: number;
  role: string | null;
  created_at: string | null;
  email: string | null;
  last_sign_in_at: string | null;
};

type RawSubscription = Omit<SystemSubscription, "subscription_plans"> & {
  subscription_plans:
    | SystemSubscription["subscription_plans"]
    | NonNullable<SystemSubscription["subscription_plans"]>[];
};

export async function loadRestaurants(
  supabase: SupabaseClient,
  restaurantId?: number
): Promise<SystemRestaurant[]> {
  let query = supabase
    .from("restaurants")
    .select("id, name, slug, theme, is_active, logo_url, plan")
    .order("name", { ascending: true });

  if (restaurantId) query = query.eq("id", restaurantId);

  const { data, error } = await query;
  if (error) throw new Error(`Restoranlar yüklenemedi: ${error.message}`);

  // menu_only ayrı okunur; sütun yoksa tüm restoranlar tam sürüm sayılır.
  const { data: typeRows } = await supabase.from("restaurants").select("id, menu_only");
  const menuOnlyIds = new Set(
    (typeRows ?? [])
      .filter((row) => row.menu_only === true)
      .map((row) => Number(row.id))
  );

  return (data ?? []).map((row) => ({
    id: Number(row.id),
    name: row.name,
    slug: row.slug,
    theme: row.theme ?? null,
    is_active: row.is_active !== false,
    logo_url: row.logo_url ?? null,
    plan: row.plan ?? null,
    menu_only: menuOnlyIds.has(Number(row.id)),
  }));
}

export async function loadPlans(supabase: SupabaseClient): Promise<SystemPlan[]> {
  const { data, error } = await supabase
    .from("subscription_plans")
    .select("id, name, slug, monthly_price, yearly_price")
    .order("monthly_price", { ascending: true });

  if (error) console.error("Paketler yüklenemedi:", error);
  return (data ?? []) as SystemPlan[];
}

export async function loadSubscriptions(
  supabase: SupabaseClient,
  restaurantId?: number
): Promise<SystemSubscription[]> {
  let query = supabase
    .from("subscriptions")
    .select(
      `id, restaurant_id, plan_id, status, billing_interval,
       trial_started_at, trial_ends_at, current_period_start,
       current_period_end, cancelled_at,
       subscription_plans ( id, name, slug, monthly_price, yearly_price )`
    )
    .order("current_period_start", { ascending: false, nullsFirst: false });

  if (restaurantId) query = query.eq("restaurant_id", restaurantId);

  const { data, error } = await query;
  if (error) console.error("Abonelikler yüklenemedi:", error);

  // Supabase ilişkili tabloyu bazen dizi olarak döndürür.
  return ((data ?? []) as RawSubscription[]).map((item) => ({
    ...item,
    restaurant_id: Number(item.restaurant_id),
    subscription_plans: Array.isArray(item.subscription_plans)
      ? item.subscription_plans[0] ?? null
      : item.subscription_plans ?? null,
  }));
}

// Restoranın geçerli aboneliği: önce deneme / aktif, yoksa en yenisi.
export function currentSubscription(
  subscriptions: SystemSubscription[],
  restaurantId: number
) {
  const own = subscriptions.filter((item) => item.restaurant_id === restaurantId);
  return own.find((item) => item.status === "active" || item.status === "trial") ?? own[0] ?? null;
}

// Yönetici hesapları ve giriş e-postaları. E-posta ve son giriş zamanı
// Supabase Auth'tan service role ile okunur; bu bilgiler yalnızca sistem
// sahibi sayfalarında gösterilir.
export async function loadManagers(
  supabase: SupabaseClient,
  restaurantId?: number
): Promise<SystemManager[]> {
  let query = supabase
    .from("restaurant_users")
    .select("id, user_id, restaurant_id, role, created_at")
    .order("created_at", { ascending: true });

  if (restaurantId) query = query.eq("restaurant_id", restaurantId);

  const { data, error } = await query;
  if (error) throw new Error(`Yöneticiler yüklenemedi: ${error.message}`);

  const rows = data ?? [];
  const authUsers = new Map<string, { email: string | null; last_sign_in_at: string | null }>();

  try {
    const admin = createSupabaseAdminClient();

    if (restaurantId) {
      // Tek restoran: yalnızca ilgili hesaplar okunur.
      await Promise.all(
        rows.map(async (row) => {
          const { data: result } = await admin.auth.admin.getUserById(row.user_id);
          if (result?.user) {
            authUsers.set(row.user_id, {
              email: result.user.email ?? null,
              last_sign_in_at: result.user.last_sign_in_at ?? null,
            });
          }
        })
      );
    } else {
      for (let page = 1; page <= 20; page++) {
        const { data: result, error: listError } = await admin.auth.admin.listUsers({
          page,
          perPage: 1000,
        });
        if (listError || !result) break;
        result.users.forEach((authUser) =>
          authUsers.set(authUser.id, {
            email: authUser.email ?? null,
            last_sign_in_at: authUser.last_sign_in_at ?? null,
          })
        );
        if (result.users.length < 1000) break;
      }
    }
  } catch (authError) {
    console.error("Yönetici e-postaları okunamadı:", authError);
  }

  return rows.map((row) => ({
    id: Number(row.id),
    user_id: row.user_id,
    restaurant_id: Number(row.restaurant_id),
    role: row.role ?? null,
    created_at: row.created_at ?? null,
    email: authUsers.get(row.user_id)?.email ?? null,
    last_sign_in_at: authUsers.get(row.user_id)?.last_sign_in_at ?? null,
  }));
}

export async function loadTableCounts(supabase: SupabaseClient) {
  const { data } = await supabase.from("restaurant_tables").select("restaurant_id, is_active");
  const counts = new Map<number, { total: number; active: number }>();
  (data ?? []).forEach((row) => {
    const id = Number(row.restaurant_id);
    const current = counts.get(id) ?? { total: 0, active: 0 };
    current.total += 1;
    if (row.is_active) current.active += 1;
    counts.set(id, current);
  });
  return counts;
}
