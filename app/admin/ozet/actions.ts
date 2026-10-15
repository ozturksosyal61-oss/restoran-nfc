"use server";

import { revalidatePath } from "next/cache";
import { getAdminRestaurant } from "../../../lib/admin-restaurant";
import { emailConfigured } from "../../../lib/email";
import { runWeeklyReports } from "../../../lib/weekly-report-job";

export type ReportEmailState = { tone: "ok" | "error"; text: string } | null;

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// Haftalık rapor e-postası: aç / kapat ve alıcı adresi.
export async function saveReportEmail(_: ReportEmailState, formData: FormData): Promise<ReportEmailState> {
  const admin = await getAdminRestaurant();
  if (!admin) return { tone: "error", text: "Oturum bulunamadı." };
  if (admin.isDemo) return { tone: "error", text: "Demo panelinde değişiklik yapılamaz." };

  const email = String(formData.get("email") ?? "").trim();
  if (email && (!EMAIL.test(email) || email.length > 200)) {
    return { tone: "error", text: "Geçerli bir e-posta adresi yazın." };
  }

  const { error } = await admin.supabase
    .from("restaurants")
    .update({ report_email_enabled: formData.get("enabled") === "on", report_email: email || null })
    .eq("id", admin.restaurantId);

  if (error) {
    console.error("Rapor e-postası ayarı kaydedilemedi:", error.message);
    return { tone: "error", text: "Kaydedilemedi. Lütfen tekrar deneyin." };
  }

  revalidatePath("/admin/ozet");
  return { tone: "ok", text: "Kaydedildi." };
}

// Geçen haftanın raporunu şimdi gönderir (nasıl göründüğünü görmek için).
export async function sendTestReport(_: ReportEmailState, __?: FormData): Promise<ReportEmailState> {
  const admin = await getAdminRestaurant();
  if (!admin) return { tone: "error", text: "Oturum bulunamadı." };
  if (admin.isDemo) return { tone: "error", text: "Demo panelinden e-posta gönderilemez." };
  if (!emailConfigured()) return { tone: "error", text: "E-posta gönderimi henüz ayarlanmadı." };

  const { data } = await admin.supabase
    .from("restaurants")
    .select("report_email")
    .eq("id", admin.restaurantId)
    .maybeSingle();

  const to = (data?.report_email as string | null) || admin.user.email;
  if (!to) return { tone: "error", text: "Alıcı e-posta adresi yok." };

  const result = await runWeeklyReports({ restaurantIds: [admin.restaurantId], force: true, to });
  if (result.sent === 0) {
    console.error("Deneme raporu gönderilemedi:", result);
    const reason = result.errors.find((error) => error.startsWith("Resend"))
      ? "E-posta servisi isteği reddetti; gönderici alan adı ve API anahtarını kontrol edin."
      : result.candidates === 0
        ? "Restoran bilgisi bulunamadı."
        : "Lütfen biraz sonra tekrar deneyin.";
    return { tone: "error", text: `Gönderilemedi. ${reason}` };
  }

  return { tone: "ok", text: `Geçen haftanın raporu ${to} adresine gönderildi.` };
}
