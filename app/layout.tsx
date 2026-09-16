import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://oztmenu.com"),
  title: {
    default: "OZT Digital Menu | QR & NFC Restoran Sistemi",
    template: "%s | OZT Digital Menu",
  },
  description:
    "QR ve NFC destekli dijital menü, masa bazlı sipariş, garson çağırma ve restoran yönetim platformu.",
  applicationName: "OZT Digital Menu",
  keywords: [
    "dijital menü",
    "QR menü",
    "NFC menü",
    "restoran sipariş sistemi",
    "QR sipariş",
  ],
  authors: [{ name: "OZT Digital Menu" }],
  creator: "OZT Digital Menu",
  publisher: "OZT Digital Menu",
  robots: { index: true, follow: true },

  openGraph: {
    type: "website",
    locale: "tr_TR",
    siteName: "OZT Digital Menu",
    title: "OZT Digital Menu | QR & NFC Restoran Sistemi",
    description:
      "Restoranınız için dijital menü, QR/NFC, sipariş ve müşteri deneyimi platformu.",
  },

  twitter: {
    card: "summary_large_image",
    title: "OZT Digital Menu",
    description:
      "QR & NFC destekli restoran dijital menü ve sipariş platformu.",
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
    <html
      lang="tr"
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <body>
        {children}

        {/* Meta Pixel */}
        <Script
          id="meta-pixel"
          strategy="afterInteractive"
        >
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;
            n.push=n;
            n.loaded=!0;
            n.version='2.0';
            n.queue=[];
            t=b.createElement(e);
            t.async=!0;
            t.src=v;
            s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}
            (window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');

            fbq('init', '1608960200809257');
            fbq('track', 'PageView');
          `}
        </Script>

        {/* Meta Pixel - NoScript */}
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: "none" }}
            src="https://www.facebook.com/tr?id=1608960200809257&ev=PageView&noscript=1"
            alt=""
          />
        </noscript>
      </body>
    </html>
  );
}