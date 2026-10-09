// Garson / mutfak / yönetim panelinin ana ekrana eklenebilmesi için.
// iPhone'da bildirim yalnızca ana ekrana eklenmiş uygulamada çalışır.
export const dynamic = "force-static";

export function GET() {
  return Response.json(
    {
      name: "OZT Digital Panel",
      short_name: "OZT Panel",
      description: "Sipariş, garson çağrısı ve mutfak ekranı",
      start_url: "/personel",
      scope: "/",
      display: "standalone",
      background_color: "#16140f",
      theme_color: "#16140f",
      lang: "tr",
      icons: [
        { src: "/icon", sizes: "192x192", type: "image/png" },
        { src: "/panel-icon", sizes: "512x512", type: "image/png", purpose: "any" },
      ],
    },
    { headers: { "Content-Type": "application/manifest+json; charset=utf-8" } }
  );
}
