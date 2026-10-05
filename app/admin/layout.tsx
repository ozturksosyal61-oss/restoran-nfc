import type { ReactNode } from "react";
import { redirect, unstable_rethrow } from "next/navigation";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import { createSupabaseServerClient } from "../../lib/supabase-server";
import { getPlanLabel } from "../../lib/plan";
import { readMenuOnly } from "../../lib/restaurant-type";
import { isDemoSession } from "../../lib/demo";
import { isStaffUser } from "../../lib/staff";
import AdminShell, { type AdminBilling, type AdminShellRestaurant } from "./AdminShell";
import { getBillingAccess, loadBillingAccount, loadBillingSettings, refreshIfStale } from "../../lib/billing/service";
import { billingNotice } from "../../lib/billing/notice";
import { hasAcceptedLegal } from "../../lib/legal-acceptance";
import LegalGate from "./LegalGate";
import "./admin.css";

const display = Cormorant_Garamond({
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600"],
  variable: "--font-admin-display",
});

const sans = DM_Sans({
  subsets: ["latin", "latin-ext"],
  variable: "--font-admin-sans",
});

// Tüm admin sayfalarının ortak kabuğu: sol menü, restoran adı, paket.
// Oturum yoksa (giriş sayfası) kabuk gösterilmez; yetki kontrolleri
// her sayfanın kendi içinde kalır.
export default async function AdminLayout({ children }: { children: ReactNode }) {
  let restaurant: AdminShellRestaurant | null = null;
  let plan: string | null = null;
  let menuOnly = false;
  let demoMode = false;
  let billing: AdminBilling | null = null;
  // Sözleşmeler henüz onaylanmadıysa panel yerine onay ekranı gösterilir.
  let needsLegal = false;

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: membership } = await supabase
        .from("restaurant_users")
        .select("restaurant_id")
        .eq("user_id", user.id)
        .maybeSingle();

      // Garson / mutfak hesapları yönetim paneline giremez; kendi ekranlarına gider.
      if (!membership?.restaurant_id && (await isStaffUser(user.id))) {
        redirect("/personel");
      }

      if (membership?.restaurant_id) {
        const { data } = await supabase
          .from("restaurants")
          .select("name, slug, logo_url, plan")
          .eq("id", membership.restaurant_id)
          .maybeSingle();

        if (data) {
          restaurant = { name: data.name, slug: data.slug, logo_url: data.logo_url ?? null };
          plan = data.plan ?? null;
          menuOnly = await readMenuOnly(supabase, Number(membership.restaurant_id));
          demoMode = await isDemoSession(supabase);
          if (!demoMode) needsLegal = !(await hasAcceptedLegal(Number(membership.restaurant_id)));

          // Otomatik abonelik (tablo yoksa ya da restoran elle yönetiliyorsa boş).
          const account = await refreshIfStale(await loadBillingAccount(Number(membership.restaurant_id)));
          if (account) {
            const [access, { settings }] = await Promise.all([
              getBillingAccess(Number(membership.restaurant_id)),
              loadBillingSettings(),
            ]);
            billing = {
              managed: true,
              blocked: access === "blocked",
              notice: billingNotice(account, access, settings?.grace_days ?? 7),
            };
          }
        }
      }
    }
  } catch (error) {
    // Next.js'in "dinamik sayfa" sinyali yutulmasın.
    unstable_rethrow(error);
    console.error("Admin kabuğu için restoran bilgisi alınamadı:", error);
  }

  return (
    <div className={`${display.variable} ${sans.variable}`}>
      <AdminShell
        restaurant={restaurant}
        planLabel={getPlanLabel(plan)}
        plan={plan}
        menuOnly={menuOnly}
        demoMode={demoMode}
        billing={billing}
      >
        {needsLegal && restaurant ? <LegalGate restaurantName={restaurant.name} /> : children}
      </AdminShell>
    </div>
  );
}
