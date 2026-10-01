import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    serverActions: { bodySizeLimit: "6mb" },
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
