import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function createSlug(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function generateUniqueSlug(baseSlug: string) {
  const suffix = Math.random()
    .toString(36)
    .slice(2, 7);

  return `${baseSlug || "restoran"}-${suffix}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const restaurantName =
      String(body.restaurant_name || "").trim();

    const managerName =
      String(body.manager_name || "").trim();

    const email =
      String(body.email || "")
        .trim()
        .toLowerCase();

    const phone =
      String(body.phone || "").trim();

    const password =
      String(body.password || "");

    const tableCount =
      Number(body.table_count || 20);

    if (!restaurantName) {
      return NextResponse.json(
        {
          success: false,
          error: "Restoran adı zorunludur.",
        },
        { status: 400 }
      );
    }

    if (!managerName) {
      return NextResponse.json(
        {
          success: false,
          error: "Yetkili adı zorunludur.",
        },
        { status: 400 }
      );
    }

    if (!email) {
      return NextResponse.json(
        {
          success: false,
          error: "E-posta adresi zorunludur.",
        },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Şifre en az 8 karakter olmalıdır.",
        },
        { status: 400 }
      );
    }

    if (
      !Number.isInteger(tableCount) ||
      tableCount < 1 ||
      tableCount > 500
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Masa sayısı 1 ile 500 arasında olmalıdır.",
        },
        { status: 400 }
      );
    }

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error(
        "KAYIT API: Supabase service role environment değişkeni eksik."
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Sunucu yapılandırması eksik.",
        },
        { status: 500 }
      );
    }

    const admin = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    /*
     * =====================================================
     * AUTH KULLANICISI
     * =====================================================
     */
    const {
      data: authData,
      error: authError,
    } =
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: managerName,
          phone,
          signup_source: "ozt-digital-public",
        },
      });

    if (authError || !authData.user) {
      const message =
        authError?.message || "";

      if (
        message
          .toLowerCase()
          .includes("already")
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Bu e-posta adresi zaten kayıtlı. Giriş yapmayı deneyin.",
          },
          { status: 409 }
        );
      }

      console.error(
        "KAYIT AUTH HATASI:",
        authError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Kullanıcı hesabı oluşturulamadı.",
        },
        { status: 400 }
      );
    }

    const userId = authData.user.id;

    /*
     * =====================================================
     * RESTORAN
     * =====================================================
     */
    const baseSlug = createSlug(
      restaurantName
    );

    let slug = generateUniqueSlug(
      baseSlug
    );

    for (let attempt = 0; attempt < 5; attempt++) {
      const { data: existing } =
        await admin
          .from("restaurants")
          .select("id")
          .eq("slug", slug)
          .maybeSingle();

      if (!existing) {
        break;
      }

      slug = generateUniqueSlug(
        baseSlug
      );
    }

    const {
      data: restaurant,
      error: restaurantError,
    } = await admin
      .from("restaurants")
      .insert({
        name: restaurantName,
        slug,
        description: "",
        phone: phone || null,
        table_count: tableCount,
        plan: "starter",
        is_active: true,
      })
      .select("id, slug")
      .single();

    if (
      restaurantError ||
      !restaurant
    ) {
      await admin.auth.admin.deleteUser(
        userId
      );

      console.error(
        "KAYIT RESTAURANT HATASI:",
        restaurantError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Restoran hesabı oluşturulamadı.",
        },
        { status: 400 }
      );
    }

    /*
     * =====================================================
     * RESTAURANT USER
     * =====================================================
     */
    const {
      error: membershipError,
    } = await admin
      .from("restaurant_users")
      .insert({
        user_id: userId,
        restaurant_id: restaurant.id,
      });

    if (membershipError) {
      await admin
        .from("restaurants")
        .delete()
        .eq("id", restaurant.id);

      await admin.auth.admin.deleteUser(
        userId
      );

      console.error(
        "KAYIT MEMBERSHIP HATASI:",
        membershipError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Restoran kullanıcı bağlantısı oluşturulamadı.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      restaurant_id: restaurant.id,
      restaurant_slug: restaurant.slug,
    });
  } catch (error) {
    console.error(
      "KAYIT API BEKLENMEYEN HATA:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Kayıt sırasında beklenmeyen bir hata oluştu.",
      },
      { status: 500 }
    );
  }
}
