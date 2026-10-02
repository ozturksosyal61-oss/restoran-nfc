import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import "../admin/admin.css";
import "./personel.css";

const display = Cormorant_Garamond({
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600"],
  variable: "--font-admin-display",
});

const sans = DM_Sans({
  subsets: ["latin", "latin-ext"],
  variable: "--font-admin-sans",
});

export const metadata: Metadata = {
  title: "Personel ekranı",
  robots: { index: false },
};

export const viewport: Viewport = {
  themeColor: "#16140f",
};

// Garson ve mutfak ekranları: yönetim panelinden ayrı, kenar menüsüz.
export default function StaffLayout({ children }: { children: ReactNode }) {
  return <div className={`adm stf ${display.variable} ${sans.variable}`}>{children}</div>;
}
