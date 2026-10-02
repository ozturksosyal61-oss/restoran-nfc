"use server";

import { revalidatePath } from "next/cache";
import { getAdminRestaurant } from "../../../../lib/admin-restaurant";
import { DEMO_BLOCKED_MESSAGE } from "../../../../lib/demo";
import { readMenuOnly } from "../../../../lib/restaurant-type";
import { isStaffRole, planAllowsStaff } from "../../../../lib/staff";
import { createSupabaseAdminClient } from "../../../../lib/supabase-admin";

// Garson / mutfak giriş hesabı işlemleri. Hesap Supabase Auth'ta açılır ve
// staff_accounts tablosuna bağlanır; restaurant_users'a EKLENMEZ, böylece
// yönetici paneline ve işletme verisine doğrudan erişemez.

export type StaffLoginResult = { ok: boolean; message: string } | null;

const MIN_PASSWORD = 8;

type Access =
  | { error: string; restaurantId?: undefined; employeeId?: undefined; role?: undefined }
  | { error?: undefined; restaurantId: number; employeeId: number; role: string };

async function requireEmployee(formData: FormData): Promise<Access> {
  const admin = await getAdminRestaurant();
  if (!admin) return { error: "Oturum bulunamadı. Lütfen tekrar giriş yapın." };
  if (admin.isDemo) return { error: DEMO_BLOCKED_MESSAGE };

  const employeeId = Number(formData.get("employee_id"));
  if (!Number.isInteger(employeeId) || employeeId <= 0) return { error: "Çalışan bulunamadı." };

  const [{ data: restaurant }, menuOnly, { data: employee }] = await Promise.all([
    admin.supabase.from("restaurants").select("plan").eq("id", admin.restaurantId).maybeSingle(),
    readMenuOnly(admin.supabase, admin.restaurantId),
    admin.supabase
      .from("employees")
      .select("id, role")
      .eq("id", employeeId)
      .eq("restaurant_id", admin.restaurantId)
      .maybeSingle(),
  ]);

  if (!planAllowsStaff(restaurant?.plan, menuOnly)) {
    return { error: "Garson ve mutfak girişi, sipariş alan Pro ve Premium paketlerde kullanılabilir." };
  }
  if (!employee) return { error: "Çalışan bulunamadı." };

  return { restaurantId: admin.restaurantId, employeeId, role: String(employee.role) };
}

async function loadAccount(employeeId: number, restaurantId: number) {
  const { data } = await createSupabaseAdminClient()
    .from("staff_accounts")
    .select("user_id, email, is_active")
    .eq("employee_id", employeeId)
    .eq("restaurant_id", restaurantId)
    .maybeSingle();
  return data;
}

function refresh(employeeId: number) {
  revalidatePath(`/admin/calisanlar/${employeeId}`);
  revalidatePath("/admin/calisanlar");
}

export async function createStaffLogin(_prev: StaffLoginResult, formData: FormData): Promise<StaffLoginResult> {
  const access = await requireEmployee(formData);
  if (access.error !== undefined) return { ok: false, message: access.error };
  if (!isStaffRole(access.role)) {
    return { ok: false, message: "Giriş hesabı yalnızca garson ya da mutfak görevindeki çalışanlara açılır. Önce görevi kaydedin." };
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 160) {
    return { ok: false, message: "Geçerli bir e-posta adresi girin." };
  }
  if (password.length < MIN_PASSWORD) return { ok: false, message: `Şifre en az ${MIN_PASSWORD} karakter olmalı.` };

  if (await loadAccount(access.employeeId, access.restaurantId)) {
    return { ok: false, message: "Bu çalışanın zaten bir giriş hesabı var." };
  }

  const admin = createSupabaseAdminClient();
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { staff: true },
  });

  if (createError || !created.user) {
    const taken = /already|registered|exists/i.test(createError?.message ?? "");
    return {
      ok: false,
      message: taken
        ? "Bu e-posta başka bir hesapta kullanılıyor. Farklı bir e-posta girin."
        : `Hesap açılamadı: ${createError?.message ?? "bilinmeyen hata"}`,
    };
  }

  const { error: linkError } = await admin.from("staff_accounts").insert({
    user_id: created.user.id,
    restaurant_id: access.restaurantId,
    employee_id: access.employeeId,
    email,
  });

  if (linkError) {
    await admin.auth.admin.deleteUser(created.user.id);
    const missing = /does not exist|schema cache/i.test(linkError.message);
    return {
      ok: false,
      message: missing
        ? "Personel girişi için veritabanı güncellemesi bekleniyor. Lütfen OZT Digital ile iletişime geçin."
        : `Hesap bağlanamadı: ${linkError.message}`,
    };
  }

  refresh(access.employeeId);
  return { ok: true, message: "Giriş hesabı açıldı. E-posta ve şifreyi çalışanınıza iletin." };
}

export async function changeStaffPassword(_prev: StaffLoginResult, formData: FormData): Promise<StaffLoginResult> {
  const access = await requireEmployee(formData);
  if (access.error !== undefined) return { ok: false, message: access.error };

  const password = String(formData.get("password") ?? "");
  if (password.length < MIN_PASSWORD) return { ok: false, message: `Şifre en az ${MIN_PASSWORD} karakter olmalı.` };

  const account = await loadAccount(access.employeeId, access.restaurantId);
  if (!account) return { ok: false, message: "Bu çalışanın giriş hesabı yok." };

  const { error } = await createSupabaseAdminClient().auth.admin.updateUserById(account.user_id, { password });
  if (error) return { ok: false, message: `Şifre değiştirilemedi: ${error.message}` };

  return { ok: true, message: "Şifre değiştirildi. Yeni şifreyi çalışanınıza iletin." };
}

export async function setStaffLoginActive(_prev: StaffLoginResult, formData: FormData): Promise<StaffLoginResult> {
  const access = await requireEmployee(formData);
  if (access.error !== undefined) return { ok: false, message: access.error };

  const active = formData.get("active") === "1";
  const { data, error } = await createSupabaseAdminClient()
    .from("staff_accounts")
    .update({ is_active: active })
    .eq("employee_id", access.employeeId)
    .eq("restaurant_id", access.restaurantId)
    .select("user_id");

  if (error) return { ok: false, message: `Kaydedilemedi: ${error.message}` };
  if (!data?.length) return { ok: false, message: "Bu çalışanın giriş hesabı yok." };

  refresh(access.employeeId);
  return {
    ok: true,
    message: active ? "Giriş açıldı." : "Giriş kapatıldı. Çalışan ekranı bir sonraki yenilemede kapanır.",
  };
}

export async function deleteStaffLogin(_prev: StaffLoginResult, formData: FormData): Promise<StaffLoginResult> {
  const access = await requireEmployee(formData);
  if (access.error !== undefined) return { ok: false, message: access.error };

  const account = await loadAccount(access.employeeId, access.restaurantId);
  if (!account) return { ok: false, message: "Bu çalışanın giriş hesabı yok." };

  // Auth kullanıcısı silinince staff_accounts satırı da (ON DELETE CASCADE) silinir.
  const { error } = await createSupabaseAdminClient().auth.admin.deleteUser(account.user_id);
  if (error) return { ok: false, message: `Hesap silinemedi: ${error.message}` };

  refresh(access.employeeId);
  return { ok: true, message: "Giriş hesabı silindi." };
}
