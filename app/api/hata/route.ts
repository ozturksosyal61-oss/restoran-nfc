import { NextResponse } from "next/server";
import { logError } from "../../../lib/error-log";
import { createSupabaseAdminClient } from "../../../lib/supabase-admin";

// Tarayıcı hataları buraya gönderilir (lib/report-client-error.ts).
// Herkese açıktır; bu yüzden boyut sınırlanır ve aynı bağlantıdan
// dakikada en fazla 20 kayıt kabul edilir (sunucu örneği başına). Ayrıca
// tüm sunucular için ortak sınır: dakikada en fazla 60 yeni tarayıcı hatası.

const WINDOW_MS = 60_000;
const LIMIT = 20;
const GLOBAL_NEW_PER_MINUTE = 60;
const hits = new Map<string, { count: number; start: number }>();

// Mesajı sürekli değiştirerek tabloyu doldurmaya karşı.
async function globalLimitReached() {
  const { count, error } = await createSupabaseAdminClient()
    .from("error_logs")
    .select("id", { count: "exact", head: true })
    .eq("source", "client")
    .gte("first_seen", new Date(Date.now() - WINDOW_MS).toISOString());
  return !error && (count ?? 0) >= GLOBAL_NEW_PER_MINUTE;
}

function allowed(key: string) {
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || now - entry.start > WINDOW_MS) {
    if (hits.size > 5000) hits.clear();
    hits.set(key, { count: 1, start: now });
    return true;
  }
  entry.count += 1;
  return entry.count <= LIMIT;
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!allowed(ip)) return new NextResponse(null, { status: 429 });

  const text = await request.text();
  if (text.length > 12_000) return new NextResponse(null, { status: 413 });

  let body: { message?: unknown; stack?: unknown; path?: unknown; digest?: unknown };
  try {
    body = JSON.parse(text);
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) return new NextResponse(null, { status: 400 });
  if (await globalLimitReached()) return new NextResponse(null, { status: 429 });

  await logError({
    source: "client",
    message,
    stack: typeof body.stack === "string" ? body.stack : null,
    path: typeof body.path === "string" ? body.path : null,
    digest: typeof body.digest === "string" ? body.digest : null,
    userAgent: request.headers.get("user-agent"),
  });

  return new NextResponse(null, { status: 204 });
}
