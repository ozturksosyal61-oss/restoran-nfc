"use client";

import { createClient } from "./supabase/client";

// Menü istatistikleri için açılış ve ürün incelemesi kaydı. Ziyaretçi,
// tarayıcıda üretilen rastgele bir kimlikle sayılır; kişisel veri yoktur.
// Kayıt başarısız olursa sessizce geçilir; menü hiçbir zaman etkilenmez.

const VISITOR_KEY = "ozt_visitor";

function visitorId() {
  try {
    let id = window.localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = crypto.randomUUID();
      window.localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}

// Aynı sekmede tekrar tekrar göndermemek için.
function alreadySent(key: string) {
  try {
    if (window.sessionStorage.getItem(key)) return true;
    window.sessionStorage.setItem(key, "1");
  } catch {
    // Depolama kapalıysa sunucu tarafı tekrarı zaten ayıklar.
  }
  return false;
}

export function trackMenuView(restaurantId: number, language = "tr") {
  if (!restaurantId || alreadySent(`ozt_mv_${restaurantId}`)) return;
  send(restaurantId, "menu_view", null, language);
}

export function trackProductView(restaurantId: number, productId: number, language = "tr") {
  if (!restaurantId || !productId || alreadySent(`ozt_pv_${restaurantId}_${productId}`)) return;
  send(restaurantId, "product_view", productId, language);
}

function send(restaurantId: number, event: string, productId: number | null, language: string) {
  void createClient()
    .rpc("log_menu_event", {
      p_restaurant_id: restaurantId,
      p_event: event,
      p_product_id: productId,
      p_language: language,
      p_visitor: visitorId(),
    })
    .then(({ error }) => {
      if (error && process.env.NODE_ENV !== "production") {
        console.warn("Menü istatistiği kaydedilemedi:", error.message);
      }
    });
}
