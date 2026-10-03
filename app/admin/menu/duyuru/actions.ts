"use server";

import { revalidatePath } from "next/cache";
import { getAdminRestaurant } from "../../../../lib/admin-restaurant";
import { DEMO_BLOCKED_MESSAGE } from "../../../../lib/demo";
import { normalizePopup, safeUrl } from "../../../../lib/menu-popup";

export type PopupResult = { ok: boolean; message: string } | null;

// Menü açılış duyurusunu kaydeder. Yazma oturumdaki yöneticinin yetkisiyle
// (RLS) yapılır; bağlantılar burada ve müşteri ekranında denetlenir.
export async function savePopup(_prev: PopupResult, formData: FormData): Promise<PopupResult> {
  const admin = await getAdminRestaurant();
  if (!admin) return { ok: false, message: "Oturum bulunamadı. Lütfen tekrar giriş yapın." };
  if (admin.isDemo) return { ok: false, message: DEMO_BLOCKED_MESSAGE };

  const field = (name: string) => String(formData.get(name) ?? "");
  const popup = normalizePopup({
    enabled: formData.get("enabled") === "1",
    title: field("title"),
    text: field("text"),
    imageUrl: field("imageUrl"),
    buttonLabel: field("buttonLabel"),
    linkType: field("linkType"),
    categoryId: field("categoryId"),
    url: field("url"),
    frequency: field("frequency"),
    startsOn: field("startsOn"),
    endsOn: field("endsOn"),
    version: Date.now().toString(36),
  });

  if (popup.enabled && !popup.title && !popup.text && !popup.imageUrl) {
    return { ok: false, message: "Duyuruyu açmak için bir başlık, metin ya da görsel ekleyin." };
  }
  if (popup.startsOn && popup.endsOn && popup.endsOn < popup.startsOn) {
    return { ok: false, message: "Bitiş tarihi başlangıç tarihinden önce olamaz." };
  }

  if (popup.linkType !== "none" && !popup.buttonLabel) {
    return { ok: false, message: "Düğme için bir yazı girin (ör. “Tatlılara göz at”)." };
  }
  if (popup.linkType === "url" && !popup.url) {
    return { ok: false, message: "Geçerli bir web adresi girin (https:// ile başlamalı)." };
  }
  if (popup.linkType === "category") {
    const { data: category } = popup.categoryId
      ? await admin.supabase
          .from("categories")
          .select("id")
          .eq("id", popup.categoryId)
          .eq("restaurant_id", admin.restaurantId)
          .maybeSingle()
      : { data: null };
    if (!category) return { ok: false, message: "Düğmenin götüreceği kategoriyi seçin." };
  }

  const { data: restaurant } = await admin.supabase
    .from("restaurants")
    .select("instagram_url")
    .eq("id", admin.restaurantId)
    .maybeSingle();
  if (popup.linkType === "instagram" && !safeUrl(restaurant?.instagram_url)) {
    return {
      ok: false,
      message: "Instagram adresiniz kayıtlı değil. İşletme ayarlarından ekleyin ya da “Web adresi”ni seçin.",
    };
  }

  const { error } = await admin.supabase
    .from("restaurants")
    .update({ menu_popup: popup })
    .eq("id", admin.restaurantId);

  if (error) {
    return {
      ok: false,
      message: /menu_popup/.test(error.message)
        ? "Duyuru için veritabanı güncellemesi bekleniyor. Lütfen OZT Digital ile iletişime geçin."
        : `Kaydedilemedi: ${error.message}`,
    };
  }

  revalidatePath("/admin/menu/duyuru");
  revalidatePath("/restoran", "layout");
  return {
    ok: true,
    message: popup.enabled ? "Duyuru kaydedildi ve menünüzde yayında." : "Kaydedildi. Duyuru şu an kapalı.",
  };
}
