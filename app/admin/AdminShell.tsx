"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";
import AdminIcon, { type AdminIconName } from "./AdminIcon";
import { featurePlan, getPlanLabel, hasPlanFeature, type PlanFeature } from "../../lib/plan";

type NavItem = {
  href: string;
  label: string;
  icon: AdminIconName;
  // Pakette yoksa menüde kilitli görünür (rozet: özelliğin açıldığı paket).
  feature?: PlanFeature;
};

export type AdminShellRestaurant = {
  name: string;
  slug: string;
  logo_url: string | null;
};

// Menüde hangi öğenin seçili olduğunu bulur. /admin/menu altında
// kategori ve kampanya sayfaları kendi öğelerine aittir.
function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  if (href === "/admin/menu") {
    return (
      pathname.startsWith("/admin/menu") &&
      !pathname.startsWith("/admin/menu/kategori") &&
      !pathname.startsWith("/admin/menu/promosyon") &&
      !pathname.startsWith("/admin/menu/ice-aktar") &&
      !pathname.startsWith("/admin/menu/diller") &&
      !pathname.startsWith("/admin/menu/istatistik") &&
      !pathname.startsWith("/admin/menu/kalori")
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

// Sayfalar restoranın "sadece menü" olup olmadığını buradan okur.
const MenuOnlyContext = createContext(false);

export function useAdminMenuOnly() {
  return useContext(MenuOnlyContext);
}

// Sadece menü restoranında açılabilen sayfalar. Diğerleri (panel,
// siparişler, masalar, çalışanlar, ödemeler...) ürünler sayfasına yönlenir.
const MENU_ONLY_HOME = "/admin/menu";

function isAllowedForMenuOnly(pathname: string) {
  if (pathname.startsWith("/admin/login")) return true;
  return ["/admin/menu", "/admin/qr", "/admin/ayarlar", "/admin/geri-bildirim", "/admin/ozet", "/admin/abonelik"].some(
    (href) => pathname === href || pathname.startsWith(`${href}/`)
  );
}

// Otomatik abonelikteki restoranın durumu (layout sunucuda hesaplar).
export type AdminBilling = {
  managed: boolean;
  blocked: boolean;
  notice: { tone: "info" | "warn" | "danger"; title: string; text: string } | null;
};

const BILLING_HOME = "/admin/abonelik";

export default function AdminShell({
  restaurant,
  planLabel,
  plan,
  menuOnly = false,
  demoMode = false,
  billing = null,
  children,
}: {
  restaurant: AdminShellRestaurant | null;
  planLabel: string;
  plan: string | null;
  menuOnly?: boolean;
  // Salt okunur demo hesabı: üstte uyarı şeridi, çıkışta demo sayfasına dönülür.
  demoMode?: boolean;
  billing?: AdminBilling | null;
  children: ReactNode;
}) {
  const pathname = usePathname() || "/admin";
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const menuBlocked = Boolean(restaurant) && menuOnly && !isAllowedForMenuOnly(pathname);
  // Abonelik ek süresi dolduysa yalnızca abonelik sayfası açılır.
  const billingBlocked =
    Boolean(restaurant && billing?.blocked) && !pathname.startsWith(BILLING_HOME) && !pathname.startsWith("/admin/login");
  const blocked = menuBlocked || billingBlocked;

  useEffect(() => {
    if (billingBlocked) router.replace(BILLING_HOME);
    else if (menuBlocked) router.replace(MENU_ONLY_HOME);
  }, [billingBlocked, menuBlocked, router]);

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

  // Giriş sayfası ve oturumsuz durumlar kabuksuz gösterilir.
  if (pathname.startsWith("/admin/login") || !restaurant) {
    return <div className="adm">{children}</div>;
  }

  async function logout() {
    await createClient().auth.signOut();
    router.push(demoMode ? "/demo" : "/admin/login");
    router.refresh();
  }

  const menuOnlyGroups: { label: string; items: NavItem[] }[] = [
    {
      label: "Genel",
      items: [{ href: "/admin/ozet", label: "Dönem özeti", icon: "calendar" }],
    },
    {
      label: "Menü",
      items: [
        { href: "/admin/menu", label: "Ürünler", icon: "menu" },
        { href: "/admin/menu/kategori", label: "Kategoriler", icon: "category" },
        { href: "/admin/menu/promosyon", label: "Kampanyalar", icon: "promo", feature: "campaigns" },
        { href: "/admin/menu/ice-aktar", label: "Fotoğraftan aktar", icon: "sparkle", feature: "ai" },
        { href: "/admin/menu/diller", label: "Menü dilleri", icon: "globe", feature: "languages" },
        { href: "/admin/menu/kalori", label: "Kalori bilgileri", icon: "bolt", feature: "calories" },
        { href: "/admin/menu/duyuru", label: "Açılış duyurusu", icon: "bell" },
        { href: "/admin/menu/istatistik", label: "Menü istatistikleri", icon: "eye" },
        { href: "/admin/qr", label: "QR kod", icon: "qr" },
      ],
    },
    {
      label: "Müşteriler",
      items: [{ href: "/admin/geri-bildirim", label: "Geri bildirimler", icon: "chat" }],
    },
    {
      label: "Ayarlar",
      items: [
        { href: "/admin/ayarlar", label: "İşletme bilgileri", icon: "settings" },
        ...(billing?.managed ? [{ href: BILLING_HOME, label: "Abonelik", icon: "card" as const }] : []),
      ],
    },
  ];

  const fullGroups: { label: string; items: NavItem[] }[] = [
    {
      label: "Genel",
      items: [
        { href: "/admin", label: "Panel", icon: "dashboard" },
        { href: "/admin/orders", label: "Siparişler", icon: "orders", feature: "orders" },
        { href: "/admin/ozet", label: "Dönem özeti", icon: "calendar" },
        { href: "/admin/raporlar", label: "Raporlar", icon: "chart", feature: "analytics" },
      ],
    },
    {
      label: "Menü",
      items: [
        { href: "/admin/menu", label: "Ürünler", icon: "menu" },
        { href: "/admin/menu/kategori", label: "Kategoriler", icon: "category" },
        { href: "/admin/menu/promosyon", label: "Kampanyalar", icon: "promo", feature: "campaigns" },
        { href: "/admin/menu/ice-aktar", label: "Fotoğraftan aktar", icon: "sparkle", feature: "ai" },
        { href: "/admin/menu/diller", label: "Menü dilleri", icon: "globe", feature: "languages" },
        { href: "/admin/menu/kalori", label: "Kalori bilgileri", icon: "bolt", feature: "calories" },
        { href: "/admin/menu/duyuru", label: "Açılış duyurusu", icon: "bell" },
        { href: "/admin/menu/istatistik", label: "Menü istatistikleri", icon: "eye" },
      ],
    },
    {
      label: "İşletme",
      items: [
        { href: "/admin/tables", label: "Masalar", icon: "table" },
        { href: "/admin/qr", label: "QR / NFC", icon: "qr" },
        { href: "/admin/calisanlar", label: "Çalışanlar", icon: "staff", feature: "multi_user" },
        { href: "/admin/geri-bildirim", label: "Geri bildirimler", icon: "chat" },
        { href: "/admin/degerlendirmeler", label: "Değerlendirmeler", icon: "star", feature: "staff_ratings" },
        { href: "/admin/odemeler", label: "Ödemeler", icon: "card" },
      ],
    },
    {
      label: "Ayarlar",
      items: [
        { href: "/admin/ayarlar", label: "İşletme ayarları", icon: "settings" },
        ...(billing?.managed ? [{ href: BILLING_HOME, label: "Abonelik", icon: "card" as const }] : []),
        { href: "/admin/online-odeme", label: "Online ödeme", icon: "wallet", feature: "online_payment" },
      ],
    },
  ];

  const groups = menuOnly ? menuOnlyGroups : fullGroups;
  const locked = (item: NavItem) => Boolean(item.feature && !hasPlanFeature(plan, item.feature));

  const initial = restaurant.name.trim().charAt(0).toLocaleUpperCase("tr-TR");

  return (
    <div className={`adm adm-shell ${open ? "is-open" : ""}`}>
      <button
        type="button"
        className="adm-drawer-backdrop"
        aria-label="Menüyü kapat"
        tabIndex={-1}
        onClick={() => setOpen(false)}
      />

      <aside className="adm-side" aria-label="Yönetim menüsü">
        <div className="adm-brand">
          <span className="adm-brand-logo">
            {restaurant.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={restaurant.logo_url} alt="" />
            ) : (
              initial
            )}
          </span>
          <span className="adm-brand-text">
            <strong>{restaurant.name}</strong>
            <small>
              İşletme paneli <span className="adm-plan">{planLabel}</span>
            </small>
          </span>
        </div>

        <nav className="adm-nav">
          {groups.map((group) => (
            <div key={group.label} className="adm-nav-group">
              <span className="adm-nav-label">{group.label}</span>
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`adm-nav-item ${isActive(pathname, item.href) ? "is-active" : ""} ${locked(item) ? "is-locked" : ""}`}
                  aria-current={isActive(pathname, item.href) ? "page" : undefined}
                >
                  <AdminIcon name={item.icon} />
                  {item.label}
                  {locked(item) && item.feature && <span className="adm-nav-lock">{getPlanLabel(featurePlan(item.feature))}</span>}
                </Link>
              ))}
            </div>
          ))}
        </nav>

        <div className="adm-side-foot">
          <a
            className="adm-nav-item"
            href={menuOnly ? `/restoran/${restaurant.slug}/menu` : `/restoran/${restaurant.slug}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <AdminIcon name="external" />
            {menuOnly ? "Menüyü görüntüle" : "Müşteri sayfası"}
          </a>
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
          <strong>{restaurant.name}</strong>
          <span className="adm-badge s-accent">{planLabel}</span>
        </header>

        {demoMode && (
          <div className="adm-demo-bar" role="status">
            <span className="adm-demo-bar-icon">
              <AdminIcon name="eye" size={16} />
            </span>
            <span className="adm-demo-bar-text">
              <strong>Demo paneli · inceleme modu</strong>
              <small>
                Her ekranı gezebilir, müşteri menüsünden verdiğiniz siparişi burada görebilirsiniz. Değişiklikler
                kaydedilmez.
              </small>
            </span>
            <button type="button" className="adm-btn adm-btn-sm" onClick={logout}>
              Demodan çık
            </button>
          </div>
        )}

        {billing?.notice && !demoMode && (
          <div className={`adm-demo-bar adm-billing-bar is-${billing.notice.tone}`} role="status">
            <span className="adm-demo-bar-icon">
              <AdminIcon name={billing.notice.tone === "danger" ? "alert" : "card"} size={16} />
            </span>
            <span className="adm-demo-bar-text">
              <strong>{billing.notice.title}</strong>
              <small>{billing.notice.text}</small>
            </span>
            {!pathname.startsWith(BILLING_HOME) && (
              <Link className="adm-btn adm-btn-sm" href={BILLING_HOME}>
                Aboneliğe git
              </Link>
            )}
          </div>
        )}

        {/* Sadece menü restoranında izin verilmeyen sayfa yönlenene kadar boş kalır. */}
        <MenuOnlyContext.Provider value={menuOnly}>
          {blocked ? null : children}
        </MenuOnlyContext.Provider>
      </div>
    </div>
  );
}
