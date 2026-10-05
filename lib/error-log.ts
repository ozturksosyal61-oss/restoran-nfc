import { createHash } from "node:crypto";
import { createSupabaseAdminClient } from "./supabase-admin";

// Hata kayıtları: sunucu ve tarayıcı hataları error_logs tablosuna yazılır,
// sistem panelinde (/sistem/hatalar) görünür.
// Kişisel veri tutulmaz: sorgu metni atılır, e-posta / telefon / uzun
// sayılar / anahtarlar maskelenir. Kayıt yazılamazsa sessizce geçilir;
// hata kaydı hiçbir zaman asıl isteği bozmamalı.

export type ErrorReport = {
  source: "server" | "client";
  message: string;
  stack?: string | null;
  path?: string | null;
  route?: string | null;
  digest?: string | null;
  userAgent?: string | null;
};

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const LONG_NUMBER = /\d[\d\s-]{8,}\d/g;
const TOKEN = /\b[A-Za-z0-9_-]{32,}\b/g;
const UUID = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;

export function redact(value: string) {
  return value
    .replace(EMAIL, "[e-posta]")
    .replace(UUID, "[kimlik]")
    .replace(TOKEN, "[anahtar]")
    .replace(LONG_NUMBER, "[sayı]");
}

// Sorgu metni (?masa=… gibi) ve sayfa adresindeki sayılar atılır; aynı
// sayfanın farklı siparişleri tek hata olarak toplanır.
export function cleanPath(path: string | null | undefined) {
  if (!path) return null;
  let pathname = path;
  try {
    pathname = new URL(path, "https://ozt.local").pathname;
  } catch {
    pathname = path.split("?")[0];
  }
  return redact(pathname).slice(0, 300);
}

function groupPath(path: string | null) {
  return path ? path.replace(/\/\d+(?=\/|$)/g, "/:id") : "";
}

export async function logError(report: ErrorReport) {
  try {
    const message = redact(String(report.message || "Bilinmeyen hata")).slice(0, 1000);
    const stack = report.stack ? redact(String(report.stack)).slice(0, 4000) : null;
    const path = cleanPath(report.path);
    const firstLine = message.split("\n")[0];
    const fingerprint = createHash("sha256")
      .update([report.source, firstLine, report.route || groupPath(path)].join("|"))
      .digest("hex")
      .slice(0, 40);

    const admin = createSupabaseAdminClient();
    await admin.rpc("log_error", {
      p_fingerprint: fingerprint,
      p_source: report.source,
      p_message: message,
      p_stack: stack,
      p_path: path,
      p_route: report.route ? String(report.route).slice(0, 300) : null,
      p_digest: report.digest ? String(report.digest).slice(0, 100) : null,
      p_user_agent: report.userAgent ? String(report.userAgent).slice(0, 300) : null,
    });
  } catch {
    // Kayıt yazılamadı (tablo yok, bağlantı yok): görmezden gelinir.
  }
}
