import { loadTransaction, resultPath } from "../../lib/payments/service";

// PayTR, ödeme bitince müşteriyi ödeme çerçevesinin (iframe) içinde bu
// adrese gönderir. Sayfa çerçeveden çıkıp sonucu tam sayfada açar.
// Sonucun kendisi PayTR bildirimiyle kesinleşir; burası yalnızca yönlendirir.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const tx = await loadTransaction(url.searchParams.get("ref") ?? "");
  const target = await resultPath(tx);
  const json = JSON.stringify(target).replace(/</g, "\u003c");

  const html = `<!doctype html>
<html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Ödeme sonucu</title></head>
<body style="font-family:system-ui,sans-serif;padding:24px;text-align:center">
<p>Ödeme sonucu açılıyor…</p>
<p><a href="${target.replace(/"/g, "&quot;")}" target="_top">Açılmazsa buraya dokunun</a></p>
<script>try{window.top.location.href=${json}}catch(e){window.location.href=${json}}</script>
</body></html>`;

  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}
