import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminRestaurant } from "../../../../lib/admin-restaurant";
import { hasPlanFeature } from "../../../../lib/plan";
import { normalizeTableGames } from "../../../../lib/table-games";
import AdminIcon from "../../AdminIcon";
import PlanLock from "../../PlanLock";
import GamesSettings from "./GamesSettings";

// Masa oyunları: müşteri sipariş beklerken masaca oynar. Oyunlar
// müşterinin telefonunda çalışır; veritabanına oyun verisi yazılmaz.
export default async function TableGamesSettingsPage() {
  const admin = await getAdminRestaurant();
  if (!admin) redirect("/admin/login");
  const { supabase, restaurantId } = admin;

  const { data: restaurant, error } = await supabase
    .from("restaurants")
    .select("plan, slug, table_games")
    .eq("id", restaurantId)
    .maybeSingle();
  const { data: basics } = error
    ? await supabase.from("restaurants").select("plan, slug").eq("id", restaurantId).maybeSingle()
    : { data: restaurant };

  if (!hasPlanFeature(basics?.plan, "table_games")) {
    return <PlanLock feature="table_games" title="Masa oyunları" eyebrow="Menü" />;
  }

  const setting = normalizeTableGames(restaurant?.table_games);

  return (
    <main className="adm-page" style={{ maxWidth: 820 }}>
      <header className="adm-head">
        <div className="adm-head-text">
          <span className="adm-eyebrow">Menü</span>
          <h1>Masa oyunları</h1>
          <p>
            Müşterileriniz siparişi beklerken masaca kısa oyunlar oynar. Oyunlar müşterinin telefonunda çalışır;
            kişisel veri ya da oyun kaydı tutulmaz.
          </p>
        </div>
        {basics?.slug && setting.enabled && (
          <div className="adm-head-actions">
            <Link className="adm-btn" href={`/restoran/${basics.slug}/oyunlar`} target="_blank">
              <AdminIcon name="external" size={16} />
              Oyunları dene
            </Link>
          </div>
        )}
      </header>

      {error && (
        <p className="adm-alert adm-alert-error" role="alert">
          <AdminIcon name="alert" size={16} />
          Masa oyunları için veritabanı güncellemesi bekleniyor. Lütfen OZT Digital ile iletişime geçin.
        </p>
      )}

      <GamesSettings initial={setting} />
    </main>
  );
}
