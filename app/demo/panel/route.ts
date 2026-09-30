import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "../../../lib/supabase-admin";
import { createSupabaseServerClient } from "../../../lib/supabase-server";
import { DEMO_EMAIL, DEMO_RESTAURANT_SLUG, demoPassword } from "../../../lib/demo";

// Ziyaretçiyi salt okunur demo hesabıyla Mira Kitchen paneline sokar.
// Hesap yoksa oluşturulur; şifresi ya da e-postası değiştirilmişse onarılır.

export const dynamic = "force-dynamic";

async function findUserIdByEmail(admin: SupabaseClient, email: string) {
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) return null;
    const found = data.users.find((user) => user.email?.toLowerCase() === email);
    if (found) return found.id;
    if (data.users.length < 1000) return null;
  }
  return null;
}

export async function GET(request: NextRequest) {
  const fail = (code: string) => NextResponse.redirect(new URL(`/demo?panel=${code}`, request.url));

  let admin: SupabaseClient;
  let password: string;
  try {
    admin = createSupabaseAdminClient();
    password = demoPassword();
  } catch {
    return fail("kapali");
  }

  const { data: restaurant } = await admin
    .from("restaurants")
    .select("id")
    .eq("slug", DEMO_RESTAURANT_SLUG)
    .maybeSingle();

  if (!restaurant) return fail("kapali");

  // Demo hesabı: demo_users tablosu yoksa veritabanı güncellenmemiştir.
  const { data: existing, error: demoTableError } = await admin
    .from("demo_users")
    .select("user_id")
    .limit(1)
    .maybeSingle();

  if (demoTableError) {
    console.error("Demo paneli hazır değil:", demoTableError.message);
    return fail("kapali");
  }

  let userId: string | null = existing?.user_id ?? null;

  if (!userId) {
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: DEMO_EMAIL,
      password,
      email_confirm: true,
      user_metadata: { demo: true },
    });

    userId = created?.user?.id ?? (await findUserIdByEmail(admin, DEMO_EMAIL));

    if (!userId) {
      console.error("Demo hesabı oluşturulamadı:", createError?.message);
      return fail("hata");
    }

    const { error: insertError } = await admin.from("demo_users").insert({ user_id: userId });
    if (insertError) {
      console.error("Demo hesabı işaretlenemedi:", insertError.message);
      return fail("hata");
    }
  }

  // Demo hesabı yalnızca demo restoranına bağlı olmalı.
  const { data: links } = await admin.from("restaurant_users").select("restaurant_id").eq("user_id", userId);
  const linked = (links ?? []).map((link) => Number(link.restaurant_id));

  if (linked.some((id) => id !== Number(restaurant.id))) {
    await admin.from("restaurant_users").delete().eq("user_id", userId).neq("restaurant_id", restaurant.id);
  }
  if (!linked.includes(Number(restaurant.id))) {
    const { error: linkError } = await admin
      .from("restaurant_users")
      .insert({ user_id: userId, restaurant_id: restaurant.id, role: "manager" });
    if (linkError) {
      console.error("Demo hesabı restorana bağlanamadı:", linkError.message);
      return fail("hata");
    }
  }

  // Giriş. Ziyaretçi şifreyi ya da e-postayı değiştirdiyse önce onarılır.
  const supabase = await createSupabaseServerClient();
  let { error: signInError } = await supabase.auth.signInWithPassword({ email: DEMO_EMAIL, password });

  if (signInError) {
    await admin.auth.admin.updateUserById(userId, { email: DEMO_EMAIL, password, email_confirm: true });
    ({ error: signInError } = await supabase.auth.signInWithPassword({ email: DEMO_EMAIL, password }));
  }

  if (signInError) {
    console.error("Demo girişi başarısız:", signInError.message);
    return fail("hata");
  }

  return NextResponse.redirect(new URL("/admin", request.url));
}
