import { timingSafeEqual } from "crypto";

// Vercel zamanlanmış görevleri CRON_SECRET'i "Authorization: Bearer ..." başlığıyla gönderir.
export function isCronAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const a = Buffer.from(`Bearer ${secret}`);
  const b = Buffer.from(request.headers.get("authorization") ?? "");
  return a.length === b.length && timingSafeEqual(a, b);
}
