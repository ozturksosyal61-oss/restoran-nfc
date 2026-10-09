import { requireSystemAdmin } from "../../../lib/system-admin";
import { aiConfigured } from "../../../lib/ai";
import { createSupabaseAdminClient } from "../../../lib/supabase-admin";
import { SELECTABLE_THEMES } from "../../../lib/themes";
import AdminIcon from "../../admin/AdminIcon";
import DemoCreator from "./DemoCreator";
import DemoList, { type DemoRow } from "./DemoList";

export const dynamic = "force-dynamic";
// Menü okuma yapay zekâ isteği yarım dakikayı bulabilir.
export const maxDuration = 300;

function daysUntil(value: string) {
  return Math.ceil((new Date(value).getTime() - Date.now()) / 86_400_000);
}

export default async function ProspectDemosPage({ searchParams }: { searchParams: Promise<{ aday?: string }> }) {
  await requireSystemAdmin();
  const admin = createSupabaseAdminClient();

  // Saha satıştaki bir işletme için demo kuruluyorsa ad ve not hazır gelir.
  const leadId = Number((await searchParams).aday);
  const { data: leadRow } =
    Number.isInteger(leadId) && leadId > 0
      ? await admin.from("sales_leads").select("id, name, contact_name, phone").eq("id", leadId).maybeSingle()
      : { data: null };
  const lead = leadRow
    ? {
        id: Number(leadRow.id),
        name: String(leadRow.name),
        note: [leadRow.contact_name, leadRow.phone].filter(Boolean).join(" · "),
      }
    : null;

  const { data: demos, error } = await admin
    .from("prospect_demos")
    .select("restaurant_id, prospect_name, note, manager_email, created_at")
    .order("created_at", { ascending: false });

  const ids = (demos ?? []).map((demo) => demo.restaurant_id);
  const [{ data: restaurants }, { data: tables }] = ids.length
    ? await Promise.all([
        admin.from("restaurants").select("id, slug, demo_expires_at").in("id", ids),
        admin.from("restaurant_tables").select("restaurant_id, public_token").in("restaurant_id", ids).eq("table_number", 1),
      ])
    : [{ data: [] }, { data: [] }];

  const restaurantById = new Map((restaurants ?? []).map((row) => [Number(row.id), row]));
  const tokenById = new Map((tables ?? []).map((row) => [Number(row.restaurant_id), String(row.public_token)]));

  const rows: DemoRow[] = (demos ?? [])
    .filter((demo) => restaurantById.has(Number(demo.restaurant_id)))
    .map((demo) => {
      const restaurant = restaurantById.get(Number(demo.restaurant_id))!;
      return {
        restaurantId: Number(demo.restaurant_id),
        name: String(demo.prospect_name),
        note: demo.note ? String(demo.note) : null,
        slug: String(restaurant.slug),
        tableToken: tokenById.get(Number(demo.restaurant_id)) ?? null,
        managerEmail: demo.manager_email ? String(demo.manager_email) : null,
        createdAt: String(demo.created_at),
        expiresAt: restaurant.demo_expires_at ? String(restaurant.demo_expires_at) : null,
        daysLeft: restaurant.demo_expires_at ? daysUntil(String(restaurant.demo_expires_at)) : null,
      };
    });

  const themes = SELECTABLE_THEMES.map((theme) => ({ value: theme.value, label: theme.label }));

  return (
    <main className="adm-page">
      <header className="adm-head">
        <div className="adm-head-text">
          <span className="adm-eyebrow">Satış</span>
          <h1>Müşteri demoları</h1>
          <p>
            Görüşmeden önce işletmenin menü fotoğrafını yükleyin; birkaç dakikada o işletmenin adı ve menüsüyle
            çalışan bir demo hazırlanır. Görüşmede “bu sizin menünüz, QR’ı okutun” dersiniz.
          </p>
        </div>
      </header>

      {error && (
        <p className="adm-alert adm-alert-error" role="alert">
          <AdminIcon name="alert" size={16} />
          Demolar için veritabanı güncellemesi bekleniyor: 20261011_prospect_demos.sql dosyasını Supabase’de çalıştırın.
        </p>
      )}

      <DemoCreator themes={themes} aiReady={aiConfigured()} lead={lead} />
      <DemoList rows={rows} />
    </main>
  );
}
