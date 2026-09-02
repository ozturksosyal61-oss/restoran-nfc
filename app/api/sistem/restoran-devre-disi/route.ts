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

    // Normal oturum + sistem sahibi doğrulaması.
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
          error:
            "Bu işlem için sistem sahibi yetkisi gereklidir.",
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
        "RESTORAN DEVRE DIŞI: Supabase service role yapılandırması eksik."
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

    // HİÇBİR ilişkili kayıt silinmez.
    // Yalnızca restoran pasife alınır.
    const { error } =
      await admin
        .from("restaurants")
        .update({
          is_active: false,
        })
        .eq("id", restaurantId);

    if (error) {
      console.error(
        "RESTORAN DEVRE DIŞI UPDATE ERROR:",
        error
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Restoran devre dışı bırakılamadı.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "RESTORAN DEVRE DIŞI BEKLENMEYEN HATA:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Restoran devre dışı bırakılırken beklenmeyen bir hata oluştu.",
      },
      { status: 500 }
    );
  }
}
