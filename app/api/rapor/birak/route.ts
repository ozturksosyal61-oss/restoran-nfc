import { stopWeeklyReport } from "../../../../lib/report-unsubscribe";

// E-posta istemcilerinin "aboneliği bırak" düğmesi (List-Unsubscribe-Post)
// buraya POST eder. Tarayıcıda açılırsa onay sayfasına yönlendirilir.

export async function POST(request: Request) {
  const token = new URL(request.url).searchParams.get("t");
  const done = await stopWeeklyReport(token);
  return new Response(done ? "OK" : "NOT_FOUND", { status: done ? 200 : 404 });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  return Response.redirect(new URL(`/rapor/birak?t=${encodeURIComponent(url.searchParams.get("t") ?? "")}`, url), 303);
}
