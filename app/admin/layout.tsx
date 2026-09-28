import type { ReactNode } from "react";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import { createSupabaseServerClient } from "../../lib/supabase-server";
import { getPlanLabel, hasPlanFeature } from "../../lib/plan";
import AdminShell, { type AdminShellRestaurant } from "./AdminShell";
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

      if (membership?.restaurant_id) {
        const { data } = await supabase
          .from("restaurants")
          .select("name, slug, logo_url, plan")
          .eq("id", membership.restaurant_id)
          .maybeSingle();

        if (data) {
          restaurant = { name: data.name, slug: data.slug, logo_url: data.logo_url ?? null };
          plan = data.plan ?? null;
        }
      }
    }
  } catch (error) {
    console.error("Admin kabuğu için restoran bilgisi alınamadı:", error);
  }

  return (
    <div className={`${display.variable} ${sans.variable}`}>
      <AdminShell
        restaurant={restaurant}
        planLabel={getPlanLabel(plan)}
        canUseOrders={hasPlanFeature(plan, "orders")}
        canUseStaff={hasPlanFeature(plan, "multi_user")}
      >
        {children}
      </AdminShell>
    </div>
  );
}
