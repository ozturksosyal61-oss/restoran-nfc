import { isCronAuthorized } from "../../../../lib/cron-auth";
import { runWeeklyReports } from "../../../../lib/weekly-report-job";

// Haftalık rapor e-postaları. Vercel zamanlanmış görevi (vercel.json) her
// pazartesi 06:00 UTC'de (09:00 Türkiye) çağırır ve CRON_SECRET'i
// "Authorization: Bearer ..." başlığıyla gönderir.
// Aynı hafta ikinci kez çağrılırsa gönderilmiş restoranlar atlanır.

export const maxDuration = 60;

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
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
