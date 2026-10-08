"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { createSupabaseAdminClient } from "../lib/supabase-admin";
import { CONTACT_TOPICS } from "../lib/contact";

// Ana sayfadaki "Bizimle iletişime geçin" formu. Herkese açık olduğu için
// spam'e karşı: gizli tuzak alanı, çok hızlı gönderim kontrolü ve aynı
// bağlantıdan 10 dakikada en fazla 3 talep. IP adresi saklanmaz, yalnızca
// geri çözülemeyen özeti tutulur.

export type ContactResult = { ok: boolean; message: string } | null;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 3;
const MIN_FILL_MS = 2500;

function clean(formData: FormData, key: string, max: number) {
  const value = String(formData.get(key) ?? "").replace(/\s+/g, " ").trim().slice(0, max);
  return value || null;
}

export async function submitContact(_prev: ContactResult, formData: FormData): Promise<ContactResult> {
  // Botlar gizli alanı doldurur ya da formu anında gönderir; sessizce "başarılı" denir.
  const startedAt = Number(formData.get("started_at"));
  if (String(formData.get("website") ?? "") !== "" || (Number.isFinite(startedAt) && Date.now() - startedAt < MIN_FILL_MS)) {
    return { ok: true, message: "Teşekkürler! Mesajınız bize ulaştı, en kısa sürede dönüş yapacağız." };
  }

  const name = clean(formData, "name", 80);
  const businessName = clean(formData, "business_name", 120);
  const phone = clean(formData, "phone", 30);
  const email = clean(formData, "email", 160)?.toLowerCase() ?? null;
  const city = clean(formData, "city", 80);
  const topicRaw = String(formData.get("topic") ?? "genel");
  const topic = CONTACT_TOPICS.some((item) => item.value === topicRaw) ? topicRaw : "genel";
  const message = String(formData.get("message") ?? "").trim().slice(0, 2000) || null;

  if (!name || name.length < 2) return { ok: false, message: "Adınızı yazın." };
  if (!phone && !email) return { ok: false, message: "Size ulaşabilmemiz için telefon ya da e-posta yazın." };
  if (phone && phone.replace(/\D/g, "").length < 10) return { ok: false, message: "Telefon numaranızı kontrol edin." };
  if (email && !EMAIL.test(email)) return { ok: false, message: "E-posta adresinizi kontrol edin." };
  if (formData.get("kvkk") !== "on") return { ok: false, message: "Devam etmek için aydınlatma metnini onaylayın." };

  const headerList = await headers();
  const ip = headerList.get("x-forwarded-for")?.split(",")[0]?.trim() || headerList.get("x-real-ip") || "bilinmiyor";
  const ipHash = createHash("sha256").update(`ozt-iletisim:${ip}`).digest("hex").slice(0, 32);

  try {
    const admin = createSupabaseAdminClient();
    const { count } = await admin
      .from("contact_requests")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .gte("created_at", new Date(Date.now() - WINDOW_MS).toISOString());
    if ((count ?? 0) >= MAX_PER_WINDOW) {
      return { ok: false, message: "Kısa sürede çok fazla mesaj gönderildi. Birkaç dakika sonra tekrar deneyin." };
    }

    const { error } = await admin.from("contact_requests").insert({
      name,
      business_name: businessName,
      phone,
      email,
      city,
      topic,
      message,
      source: String(formData.get("source") ?? "/").slice(0, 120),
      ip_hash: ipHash,
    });
    if (error) throw error;
  } catch {
    return {
      ok: false,
      message: "Mesajınız şu an gönderilemedi. Lütfen Instagram'dan bize yazın ya da biraz sonra tekrar deneyin.",
    };
  }

  return { ok: true, message: "Teşekkürler! Mesajınız bize ulaştı, en kısa sürede dönüş yapacağız." };
}
