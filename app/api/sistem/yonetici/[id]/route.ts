import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../../../../lib/supabase-server";

type Context = {
  params: Promise<{
    id: string;
  }>;
};

export async function DELETE(
  request: Request,
  { params }: Context
) {
  try {
    const { id } = await params;

    const supabase =
      await createSupabaseServerClient();

    // =====================================================
    // OTURUM
    // =====================================================

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          error: "Oturum bulunamadı.",
        },
        {
          status: 401,
        }
      );
    }

    // =====================================================
    // SİSTEM SAHİBİ KONTROLÜ
    // =====================================================

    const { data: systemAdmin } =
      await supabase
        .from("system_admins")
        .select("user_id")
        .eq("user_id", user.id)
        .single();

    if (!systemAdmin) {
      return NextResponse.json(
        {
          error: "Bu işlem için yetkiniz yok.",
        },
        {
          status: 403,
        }
      );
    }

    // =====================================================
    // YÖNETİCİ KAYDI
    // =====================================================

    const { data: manager, error: managerError } =
      await supabase
        .from("restaurant_users")
        .select(
          "id, user_id, restaurant_id"
        )
        .eq("id", id)
        .single();

    if (
      managerError ||
      !manager
    ) {
      return NextResponse.json(
        {
          error: "Yönetici bulunamadı.",
        },
        {
          status: 404,
        }
      );
    }

    // =====================================================
    // RESTORAN BAĞLANTISINI SİL
    // =====================================================

    const { error: deleteError } =
      await supabase
        .from("restaurant_users")
        .delete()
        .eq("id", id);

    if (deleteError) {
      console.error(
        "Yönetici silme hatası:",
        deleteError
      );

      return NextResponse.json(
        {
          error:
            "Yönetici kaldırılamadı: " +
            deleteError.message,
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "Yönetici restoran bağlantısından kaldırıldı.",
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error:
          "Beklenmeyen bir hata oluştu.",
      },
      {
        status: 500,
      }
    );
  }
}