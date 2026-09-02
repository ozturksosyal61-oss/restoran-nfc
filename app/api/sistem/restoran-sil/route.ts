import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "../../../../lib/supabase-server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const restaurantId = Number(
      body.restaurant_id
    );

    if (
      !Number.isInteger(restaurantId) ||
      restaurantId <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Geçersiz restoran ID.",
        },
        { status: 400 }
      );
    }

    // Önce normal oturum + sistem sahibi kontrolü.
    const supabase =
      await createSupabaseServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Yetkisiz erişim.",
        },
        { status: 401 }
      );
    }

    const { data: systemAdmin } =
      await supabase
        .from("system_admins")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

    if (!systemAdmin) {
      return NextResponse.json(
        {
          success: false,
          error: "Bu işlem için sistem sahibi yetkisi gereklidir.",
        },
        { status: 403 }
      );
    }

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (
      !supabaseUrl ||
      !serviceRoleKey
    ) {
      console.error(
        "RESTORAN SİLME: Supabase service role yapılandırması eksik."
      );

      return NextResponse.json(
        {
          success: false,
          error: "Sunucu yapılandırması eksik.",
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

    // Tek SQL DELETE isteği: başarısız olursa PostgreSQL işlemi geri alır.
    const { error } =
      await admin
        .from("restaurants")
        .delete()
        .eq("id", restaurantId);

    if (error) {
      console.error(
        "RESTORAN DELETE ERROR:",
        error
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Restoran silinemedi. Bağlı kayıtlar nedeniyle veritabanı silme işlemini engellemiş olabilir.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "RESTORAN SİLME BEKLENMEYEN HATA:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Restoran silme sırasında beklenmeyen bir hata oluştu.",
      },
      { status: 500 }
    );
  }
}
