import type { Metadata } from "next";
import type { ReactNode } from "react";
import { pageMetadata } from "../../lib/site";

export const metadata: Metadata = pageMetadata({
  path: "/abonelik",
  title: "Paketler ve Fiyatlar",
  description:
    "OZT Digital QR menü ve NFC dijital menü paketleri: Başlangıç, Pro ve Premium paketlerin özellikleri ve fiyatları.",
});

export default function SubscriptionLayout({ children }: { children: ReactNode }) {
  return children;
}
