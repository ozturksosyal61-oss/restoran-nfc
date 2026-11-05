import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    serverActions: { bodySizeLimit: "6mb" },
  },
  // Bluff House yasal/destek sayfaları (public/bluffhouse) uzantısız adreslerle de açılır.
  async rewrites() {
    const pages = [
      "gizlilik",
      "kullanim-sartlari",
      "hesap-silme",
      "destek",
      "en/privacy",
      "en/terms",
      "en/delete-account",
      "en/support",
    ];
    const root = [
      { source: "/bluffhouse", destination: "/bluffhouse/index.html" },
    ];
    // Minotaur yasal sayfaları (public/minotaur) da uzantısız açılır.
    const minotaur = ["gizlilik", "aydinlatma", "acik-riza", "kosullar", "hesap-sil"];
    return [
      ...root,
      { source: "/minotaur", destination: "/minotaur/index.html" },
      ...pages.map((page) => ({
        source: `/bluffhouse/${page}`,
        destination: `/bluffhouse/${page}.html`,
      })),
      ...minotaur.map((page) => ({
        source: `/minotaur/${page}`,
        destination: `/minotaur/${page}.html`,
      })),
    ];
  },
  async headers() {
    const common = [
      { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    ];
    return [
      {
        source: "/((?!odeme-donus).*)",
        headers: [...common, { key: "X-Frame-Options", value: "DENY" }],
      },
      {
        // PayTR ödeme çerçevesi bitince bu sayfayı kendi sitemizin içinde açar.
        source: "/odeme-donus",
        headers: [...common, { key: "X-Frame-Options", value: "SAMEORIGIN" }],
      },
    ];
  },
};
export default nextConfig;
