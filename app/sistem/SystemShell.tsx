"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";
import AdminIcon, { type AdminIconName } from "../admin/AdminIcon";

type NavItem = {
  href: string;
  label: string;
  icon: AdminIconName;
};

const GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "İşletmeler",
    items: [
      { href: "/sistem", label: "Restoranlar", icon: "store" },
      { href: "/sistem/yeni-restoran", label: "Yeni restoran", icon: "plus" },
      { href: "/sistem/demolar", label: "Müşteri demoları", icon: "sparkle" },
    ],
  },
  {
    label: "Yönetim",
    items: [
      { href: "/sistem/abonelikler", label: "Abonelikler", icon: "card" },
      { href: "/sistem/odeme-ayarlari", label: "Otomatik ödeme", icon: "wallet" },
      { href: "/sistem/yoneticiler", label: "Yönetici hesapları", icon: "user" },
    ],
  },
];

// Restoran detay sayfaları "Restoranlar" öğesine aittir.
function isActive(pathname: string, href: string) {
  if (href === "/sistem") {
    return pathname === "/sistem" || pathname.startsWith("/sistem/restoran/");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

// Sistem sahibi panelinin ortak kabuğu. Admin panelinin tasarım sistemini
// (admin.css) kullanır; .sys sınıfı kenar menüyü lacivert tona çevirir.
export default function SystemShell({
  adminEmail,
  children,
}: {
  adminEmail: string | null;
  children: ReactNode;
}) {
  const pathname = usePathname() || "/sistem";
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // Sayfa değişince mobil menüyü kapat.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Giriş sayfası ve yetkisiz durumlar kabuksuz gösterilir.
  if (pathname.startsWith("/sistem/login") || !adminEmail) {
    return <div className="adm sys">{children}</div>;
  }

  async function logout() {
    await createClient().auth.signOut();
    router.replace("/sistem/login");
    router.refresh();
  }

  return (
    <div className={`adm sys adm-shell ${open ? "is-open" : ""}`}>
      <button
        type="button"
        className="adm-drawer-backdrop"
        aria-label="Menüyü kapat"
        tabIndex={-1}
        onClick={() => setOpen(false)}
      />

      <aside className="adm-side" aria-label="Sistem menüsü">
        <div className="adm-brand">
          <span className="adm-brand-logo">O</span>
          <span className="adm-brand-text">
            <strong>OZT Digital</strong>
            <small>
              Sistem paneli <span className="adm-plan">SAHİP</span>
            </small>
          </span>
        </div>

        <nav className="adm-nav">
          {GROUPS.map((group) => (
            <div key={group.label} className="adm-nav-group">
              <span className="adm-nav-label">{group.label}</span>
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`adm-nav-item ${isActive(pathname, item.href) ? "is-active" : ""}`}
                  aria-current={isActive(pathname, item.href) ? "page" : undefined}
                >
                  <AdminIcon name={item.icon} />
                  {item.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>

        <div className="adm-side-foot">
          <span className="sys-side-user" title={adminEmail}>
            <AdminIcon name="lock" size={15} />
            <span>{adminEmail}</span>
          </span>
          <button type="button" className="adm-nav-item" onClick={logout}>
            <AdminIcon name="logout" />
            Çıkış yap
          </button>
        </div>
      </aside>

      <div className="adm-main">
        <header className="adm-topbar">
          <button
            type="button"
            className="adm-btn adm-btn-icon"
            onClick={() => setOpen(true)}
            aria-label="Menüyü aç"
            aria-expanded={open}
          >
            <AdminIcon name="menuBars" />
          </button>
          <strong>OZT Digital</strong>
          <span className="adm-badge s-accent">SİSTEM</span>
        </header>

        {children}
      </div>
    </div>
  );
}
