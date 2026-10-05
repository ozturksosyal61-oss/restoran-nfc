import { NextResponse } from "next/server";
import { logError } from "../../../lib/error-log";

// Tarayıcı hataları buraya gönderilir (lib/report-client-error.ts).
// Herkese açıktır; bu yüzden boyut sınırlanır ve aynı bağlantıdan
// dakikada en fazla 20 kayıt kabul edilir (sunucu örneği başına).

const WINDOW_MS = 60_000;
const LIMIT = 20;
const hits = new Map<string, { count: number; start: number }>();

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
