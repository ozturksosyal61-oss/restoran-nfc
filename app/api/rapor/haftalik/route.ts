import { timingSafeEqual } from "crypto";
import { runWeeklyReports } from "../../../../lib/weekly-report-job";

// Haftalık rapor e-postaları. Vercel zamanlanmış görevi (vercel.json) her
// pazartesi 06:00 UTC'de (09:00 Türkiye) çağırır ve CRON_SECRET'i
// "Authorization: Bearer ..." başlığıyla gönderir.
// Aynı hafta ikinci kez çağrılırsa gönderilmiş restoranlar atlanır.

export const maxDuration = 60;

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const a = Buffer.from(`Bearer ${secret}`);
  const b = Buffer.from(request.headers.get("authorization") ?? "");
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return new Response("UNAUTHORIZED", { status: 401 });
  }

  try {
    const result = await runWeeklyReports();
    if (result.errors.length > 0) console.error("Haftalık rapor hataları:", result.errors);
    return Response.json(result);
  } catch (error) {
    console.error("Haftalık rapor gönderilemedi", error);
    return new Response("ERROR", { status: 500 });
  }
}
