"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "../../../../lib/supabase-server";

export async function deleteCategory(categoryId: number) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: "Oturum bulunamadı.",
    };
  }

  // Kullanıcının restoranını bul
  const { data: membership, error: membershipError } = await supabase
    .from("restaurant_users")
    .select("restaurant_id")
    .eq("user_id", user.id)
    .single();

  if (membershipError || !membership) {
    return {
      error: "İşletme bağlantısı bulunamadı.",
    };
  }

  // Kategorinin gerçekten bu restorana ait olduğunu kontrol et
  const { data: category, error: categoryError } = await supabase
    .from("categories")
    .select("id, restaurant_id, name")
    .eq("id", categoryId)
    .eq("restaurant_id", membership.restaurant_id)
    .single();

  if (categoryError || !category) {
    return {
      error: "Kategori bulunamadı veya bu kategoriye erişim yetkiniz yok.",
    };
  }

  // Kategoride ürün var mı?
  const { count, error: productsError } = await supabase
    .from("products")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("category_id", categoryId);

  if (productsError) {
    console.error("KATEGORİ ÜRÜN KONTROLÜ:", productsError);

    return {
      error: "Kategorideki ürünler kontrol edilemedi.",
    };
  }

  if ((count ?? 0) > 0) {
    return {
      error:
        "Bu kategoride ürünler bulunuyor. Önce ürünleri silin veya başka bir kategoriye taşıyın.",
    };
  }

  // Kategori sil
  const { error: deleteError } = await supabase
    .from("categories")
    .delete()
    .eq("id", categoryId)
    .eq("restaurant_id", membership.restaurant_id);

  if (deleteError) {
    console.error("KATEGORİ SİLME HATASI:", deleteError);

    return {
      error: "Kategori silinemedi.",
    };
  }

  revalidatePath("/admin/menu");

  return {
    success: true,
  };
}