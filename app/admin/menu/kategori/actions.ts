"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "../../../../lib/supabase-server";

export async function deleteCategory(categoryId: number) {
  const supabase = await createSupabaseServerClient();

  // =====================================================
  // OTURUM
  // =====================================================

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: "Oturum bulunamadı.",
    };
  }

  // =====================================================
  // KULLANICININ RESTORANINI BUL
  // =====================================================

  const { data: membership, error: membershipError } =
    await supabase
      .from("restaurant_users")
      .select("restaurant_id")
      .eq("user_id", user.id)
      .single();

  if (membershipError || !membership?.restaurant_id) {
    console.error(
      "RESTAURAN ÜYELİĞİ BULUNAMADI:",
      membershipError
    );

    return {
      error: "İşletme bağlantısı bulunamadı.",
    };
  }

  const restaurantId = membership.restaurant_id;

  // =====================================================
  // KATEGORİYİ BUL
  // =====================================================

  const { data: category, error: categoryError } =
    await supabase
      .from("categories")
      .select("id, restaurant_id, name")
      .eq("id", categoryId)
      .eq("restaurant_id", restaurantId)
      .maybeSingle();

  if (categoryError) {
    console.error(
      "KATEGORİ BULMA HATASI:",
      categoryError
    );

    return {
      error: "Kategori kontrol edilemedi.",
    };
  }

  if (!category) {
    return {
      error:
        "Kategori bulunamadı veya bu kategoriye erişim yetkiniz yok.",
    };
  }

  // =====================================================
  // KATEGORİDE ÜRÜN VAR MI?
  //
  // Ürünleri otomatik olarak silmiyoruz.
  // Böylece yanlışlıkla ürün kaybı yaşanmaz.
  // =====================================================

  const {
    data: products,
    error: productsError,
  } = await supabase
    .from("products")
    .select("id")
    .eq("category_id", categoryId)
    .limit(1);

  if (productsError) {
    console.error(
      "KATEGORİ ÜRÜN KONTROLÜ:",
      productsError
    );

    return {
      error:
        "Kategorideki ürünler kontrol edilemedi. Kategori silinemedi.",
    };
  }

  if (products && products.length > 0) {
    return {
      error:
        `"${category.name}" kategorisinde ürünler bulunuyor. Önce ürünleri silin veya başka bir kategoriye taşıyın.`,
    };
  }

  // =====================================================
  // KATEGORİYİ SİL
  // =====================================================

  const { data: deletedCategory, error: deleteError } =
    await supabase
      .from("categories")
      .delete()
      .eq("id", categoryId)
      .eq("restaurant_id", restaurantId)
      .select("id")
      .maybeSingle();

  if (deleteError) {
    console.error(
      "KATEGORİ SİLME HATASI:",
      deleteError
    );

    return {
      error:
        `Kategori silinemedi: ${deleteError.message}`,
    };
  }

  // RLS nedeniyle işlem başarılı görünse bile satır
  // silinmemiş olabilir. Bunu kullanıcıya açıkça bildir.
  if (!deletedCategory) {
    console.error(
      "KATEGORİ SİLİNEMEDİ: Supabase DELETE sonucunda satır dönmedi."
    );

    return {
      error:
        "Kategori silinemedi. Supabase RLS izinlerini kontrol edin.",
    };
  }

  // =====================================================
  // ÖNBELLEĞİ YENİLE
  // =====================================================

  revalidatePath("/admin/menu");

  return {
    success: true,
  };
}
