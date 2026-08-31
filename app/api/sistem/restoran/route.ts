import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { normalizeRestaurantTheme } from "../../../../lib/themes";

export async function POST(request: Request) {
  let restaurantId: number | null = null;
  let createdUserId: string | null = null;

  try {
    const body = await request.json();

    const {
      name,
      slug,
      description,
      instagram_url,
      google_review_url,
      manager_email,
      manager_password,
      table_count,
      theme,
    } = body;

    if (!name || !slug || !manager_email || !manager_password) {
      return NextResponse.json(
        { error: "Restoran adı, slug, yönetici e-posta ve şifre zorunludur." },
        { status: 400 }
      );
    }

    if (manager_password.length < 8) {
      return NextResponse.json(
        { error: "Yönetici şifresi en az 8 karakter olmalıdır." },
        { status: 400 }
      );
    }

    const tableCount = Number(table_count);

    if (
      !Number.isInteger(tableCount) ||
      tableCount < 1 ||
      tableCount > 500
    ) {
      return NextResponse.json(
        { error: "Masa sayısı 1 ile 500 arasında olmalıdır." },
        { status: 400 }
      );
    }

    const restaurantTheme = String(theme || "classic").toLowerCase();

    const allowedThemes = [
      "classic",
      "dark-modern",
      "luxury-gold",
      "ozt-glass-premium",
    ];

    if (!allowedThemes.includes(restaurantTheme)) {
      return NextResponse.json(
        { error: "Geçersiz restoran teması." },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();

    const supabaseSession = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options);
              });
            } catch {
              // Route Handler cookie yazma hatası görmezden gelinir.
            }
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabaseSession.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Oturum bulunamadı. Lütfen tekrar giriş yapın." },
        { status: 401 }
      );
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { data: systemAdmin, error: systemAdminError } =
      await supabaseAdmin
        .from("system_admins")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

    if (systemAdminError) {
      console.error(systemAdminError);

      return NextResponse.json(
        { error: "Sistem sahibi yetkisi kontrol edilemedi." },
        { status: 500 }
      );
    }

    if (!systemAdmin) {
      return NextResponse.json(
        { error: "Bu işlem için sistem sahibi yetkisi gerekiyor." },
        { status: 403 }
      );
    }

    const { data: existingRestaurant } = await supabaseAdmin
      .from("restaurants")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (existingRestaurant) {
      return NextResponse.json(
        { error: `"${slug}" slug adresi zaten kullanılıyor.` },
        { status: 409 }
      );
    }

    const { data: restaurant, error: restaurantError } =
      await supabaseAdmin
        .from("restaurants")
        .insert({
          name,
          slug,
          description: description || null,
          instagram_url: instagram_url || null,
          google_review_url: google_review_url || null,
          theme: normalizeRestaurantTheme(restaurantTheme),
        })
        .select("id")
        .single();

    if (restaurantError || !restaurant) {
      console.error("Restaurant oluşturma hatası:", restaurantError);

      return NextResponse.json(
        {
          error:
            restaurantError?.message || "Restoran oluşturulamadı.",
        },
        { status: 500 }
      );
    }

    restaurantId = restaurant.id;

    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: manager_email,
        password: manager_password,
        email_confirm: true,
      });

    if (authError || !authData.user) {
      console.error("Auth kullanıcı hatası:", authError);

      await supabaseAdmin
        .from("restaurants")
        .delete()
        .eq("id", restaurantId);

      return NextResponse.json(
        {
          error:
            authError?.message || "Yönetici hesabı oluşturulamadı.",
        },
        { status: 500 }
      );
    }

    createdUserId = authData.user.id;

    const { error: managerError } = await supabaseAdmin
      .from("restaurant_users")
      .insert({
        user_id: createdUserId,
        restaurant_id: restaurantId,
        role: "manager",
      });

    if (managerError) {
      console.error("Restaurant manager bağlantı hatası:", managerError);

      await supabaseAdmin.auth.admin.deleteUser(createdUserId);
      await supabaseAdmin
        .from("restaurants")
        .delete()
        .eq("id", restaurantId);

      return NextResponse.json(
        {
          error:
            managerError.message || "Restoran yöneticisi bağlanamadı.",
        },
        { status: 500 }
      );
    }

    const tables = Array.from(
      { length: tableCount },
      (_, index) => ({
        restaurant_id: restaurantId,
        table_number: index + 1,
        public_token: crypto.randomUUID(),
        is_active: true,
      })
    );

    const { error: tablesError } = await supabaseAdmin
      .from("restaurant_tables")
      .insert(tables);

    if (tablesError) {
      console.error("Masa oluşturma hatası:", tablesError);

      await supabaseAdmin
        .from("restaurant_users")
        .delete()
        .eq("user_id", createdUserId)
        .eq("restaurant_id", restaurantId);

      await supabaseAdmin.auth.admin.deleteUser(createdUserId);

      await supabaseAdmin
        .from("restaurants")
        .delete()
        .eq("id", restaurantId);

      return NextResponse.json(
        {
          error:
            tablesError.message ||
            "Restoran masaları oluşturulamadı.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      restaurant_id: restaurantId,
      manager_user_id: createdUserId,
      table_count: tableCount,
      theme: normalizeRestaurantTheme(restaurantTheme),
    });
  } catch (error) {
    console.error("Yeni restoran API hatası:", error);

    return NextResponse.json(
      { error: "Sunucu tarafında beklenmeyen bir hata oluştu." },
      { status: 500 }
    );
  }
}
