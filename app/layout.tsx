import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://oztmenu.com"),
  title: {
    default: "OZT Digital Menu | QR & NFC Restoran Sistemi",
    template: "%s | OZT Digital Menu",
  },
  description:
    "QR ve NFC destekli dijital menü, masa bazlı sipariş, garson çağırma ve restoran yönetim platformu.",
  applicationName: "OZT Digital Menu",
  keywords: ["dijital menü", "QR menü", "NFC menü", "restoran sipariş sistemi", "QR sipariş"],
  authors: [{ name: "OZT Digital Menu" }],
  creator: "OZT Digital Menu",
  publisher: "OZT Digital Menu",
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "tr_TR",
    siteName: "OZT Digital Menu",
    title: "OZT Digital Menu | QR & NFC Restoran Sistemi",
    description: "Restoranınız için dijital menü, QR/NFC, sipariş ve müşteri deneyimi platformu.",
  },
  twitter: {
    card: "summary_large_image",
    title: "OZT Digital Menu",
    description: "QR & NFC destekli restoran dijital menü ve sipariş platformu.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#111111",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
