import { hasPlanFeature } from "./plan";
import { createSupabaseAdminClient } from "./supabase-admin";
import { createSupabaseServerClient } from "./supabase-server";

// Garson ve mutfak hesapları (staff_accounts). Bu kullanıcılar yönetici
// değildir; veritabanına doğrudan erişemezler. Ekran verisi sunucuda,
// her istekte bu oturum doğrulanarak service role ile hazırlanır.

export type StaffRole = "garson" | "mutfak";

export type StaffSession = {
  userId: string;
  restaurantId: number;
  restaurantName: string;
  restaurantSlug: string;
  employeeId: number;
  name: string;
  role: StaffRole;
};

export type StaffCheck =
  | { ok: true; session: StaffSession }
  | { ok: false; reason: "no-user" | "not-staff" | "inactive" | "role" | "plan" | "missing-table" };

export const STAFF_ROLES: StaffRole[] = ["garson", "mutfak"];

export function isStaffRole(value: unknown): value is StaffRole {
  return value === "garson" || value === "mutfak";
}

// Garson / mutfak hesabı açılabilen paket: sipariş alan ve çok kullanıcılı.
export function planAllowsStaff(plan: unknown, menuOnly: boolean) {
  return !menuOnly && hasPlanFeature(plan, "orders") && hasPlanFeature(plan, "multi_user");
}

export const STAFF_DENIED_TEXT: Record<Exclude<StaffCheck, { ok: true }>["reason"], string> = {
  "no-user": "Oturum bulunamadı. Lütfen giriş yapın.",
  "not-staff": "Bu hesap bir garson ya da mutfak hesabı değil.",
  inactive: "Hesabınız işletme tarafından kapatılmış. Lütfen yöneticinize başvurun.",
  role: "Hesabınıza garson ya da mutfak görevi atanmamış. Lütfen yöneticinize başvurun.",
  plan: "İşletmenin paketi garson ve mutfak ekranlarını kapsamıyor. Lütfen yöneticinize başvurun.",
  "missing-table": "Personel girişi için veritabanı güncellemesi bekleniyor. Lütfen OZT Digital ile iletişime geçin.",
};

// Bu kullanıcı bir personel hesabı mı (yönetici panelinden yönlendirmek için).
export async function isStaffUser(userId: string) {
  const { data, error } = await createSupabaseAdminClient()
    .from("staff_accounts")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  return !error && Boolean(data);
}

export async function checkStaffSession(): Promise<StaffCheck> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "no-user" };

  const admin = createSupabaseAdminClient();
  const { data: account, error } = await admin
    .from("staff_accounts")
    .select("restaurant_id, employee_id, is_active, last_seen_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    const missing = error.code === "42P01" || error.code === "PGRST205" || /does not exist|schema cache/i.test(error.message);
    return { ok: false, reason: missing ? "missing-table" : "not-staff" };
  }
  if (!account) return { ok: false, reason: "not-staff" };
  if (!account.is_active) return { ok: false, reason: "inactive" };

  const restaurantId = Number(account.restaurant_id);
  const [{ data: employee }, { data: restaurant }, { data: typeRow, error: typeError }] = await Promise.all([
    admin
      .from("employees")
      .select("id, name, role, is_active")
      .eq("id", account.employee_id)
      .eq("restaurant_id", restaurantId)
      .maybeSingle(),
    admin.from("restaurants").select("name, slug, plan, is_active").eq("id", restaurantId).maybeSingle(),
    admin.from("restaurants").select("menu_only").eq("id", restaurantId).maybeSingle(),
  ]);

  if (!employee || employee.is_active === false || !restaurant || restaurant.is_active === false) {
    return { ok: false, reason: "inactive" };
  }
  if (!isStaffRole(employee.role)) return { ok: false, reason: "role" };

  const menuOnly = !typeError && typeRow?.menu_only === true;
  if (!planAllowsStaff(restaurant.plan, menuOnly)) return { ok: false, reason: "plan" };

  // Son görülme en fazla dakikada bir yazılır.
  const lastSeen = account.last_seen_at ? new Date(account.last_seen_at).getTime() : 0;
  if (Date.now() - lastSeen > 60_000) {
    await admin.from("staff_accounts").update({ last_seen_at: new Date().toISOString() }).eq("user_id", user.id);
  }

  return {
    ok: true,
    session: {
      userId: user.id,
      restaurantId,
      restaurantName: String(restaurant.name),
      restaurantSlug: String(restaurant.slug),
      employeeId: Number(employee.id),
      name: String(employee.name),
      role: employee.role,
    },
  };
}
