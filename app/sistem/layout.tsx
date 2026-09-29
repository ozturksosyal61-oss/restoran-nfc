import type { ReactNode } from "react";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import { getSystemAdminUser } from "../../lib/system-admin";
import SystemShell from "./SystemShell";
import "../admin/admin.css";
import "./sistem.css";

const display = Cormorant_Garamond({
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600"],
  variable: "--font-admin-display",
});

const sans = DM_Sans({
  subsets: ["latin", "latin-ext"],
  variable: "--font-admin-sans",
});

// Sistem sahibi sayfalarının ortak kabuğu. Yetki kontrolü her sayfanın
// kendisinde yapılır; burada yalnızca menünün gösterilip gösterilmeyeceği
// belirlenir.
export default async function SystemLayout({ children }: { children: ReactNode }) {
  const user = await getSystemAdminUser();

  return (
    <div className={`${display.variable} ${sans.variable}`}>
      <SystemShell adminEmail={user?.email ?? null}>{children}</SystemShell>
    </div>
  );
}
