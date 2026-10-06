import type { Metadata } from "next";

// Sitenin adresi ve marka adı: TEK KAYNAK.
// Alan adı değişirse yalnızca burası (ya da NEXT_PUBLIC_SITE_URL) güncellenir;
// metadataBase, canonical, sitemap, robots ve yapılandırılmış veri buradan okur.

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.oztdigital.com.tr").replace(/\/+$/, "");
export const SITE_HOST = new URL(SITE_URL).host;
export const SITE_NAME = "OZT Digital";
export const SITE_TITLE = "QR Menü ve NFC Dijital Menü Sistemi | OZT Digital";
export const SITE_DESCRIPTION =
  "Restoran ve kafeler için QR menü ve NFC dijital menü sistemi: masadan sipariş, garson çağırma, masadan ödeme ve restoran yönetim paneli.";
// Arama motorlarına gösterilmeyen test restoranları (sitemap dışı, noindex).
export const HIDDEN_RESTAURANT_SLUGS = new Set(["ozt-kafe"]);

export const SHARE_IMAGE_ALT = "OZT Digital: restoranlar için QR menü ve NFC dijital menü sistemi";

export const INSTAGRAM_URL = "https://www.instagram.com/oztdigitalcomtr/";

// Sayfaya özel başlık, açıklama, canonical ve og:url.
// openGraph sayfada tanımlanınca kökteki değerlerin yerine geçtiği için
// ortak alanlar burada yeniden verilir.
export function pageMetadata({
  path,
  title,
  description,
  absoluteTitle = false,
  index = true,
}: {
  path: string;
  title: string;
  description: string;
  absoluteTitle?: boolean;
  index?: boolean;
}): Metadata {
  const fullTitle = absoluteTitle ? title : `${title} | ${SITE_NAME}`;
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    // Sayfa openGraph tanımlayınca kökteki paylaşım görseli devralınmaz;
    // bu yüzden görsel (app/opengraph-image.tsx) açıkça verilir.
    openGraph: {
      type: "website",
      locale: "tr_TR",
      siteName: SITE_NAME,
      url: path,
      title: fullTitle,
      description,
      images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: SHARE_IMAGE_ALT }],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [{ url: "/twitter-image", width: 1200, height: 630, alt: SHARE_IMAGE_ALT }],
    },
    ...(index ? {} : { robots: { index: false, follow: true } }),
  };
}
