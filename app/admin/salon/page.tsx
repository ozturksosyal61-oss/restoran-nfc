import { redirect } from "next/navigation";
import { getAdminRestaurant } from "../../../lib/admin-restaurant";
import { planGate } from "../../../lib/admin-plan";
import { loadFloor } from "../../../lib/floor";
import PlanLock from "../PlanLock";
import FloorView from "./FloorView";

export const dynamic = "force-dynamic";

// Canlı masa haritası: salondaki masaların anlık durumu ve hızlı işlemler.
export default async function SalonPage() {
  const admin = await getAdminRestaurant();
  if (!admin) redirect("/admin/login");

  if (await planGate(admin, "orders")) {
    return <PlanLock feature="orders" title="Salon" eyebrow="Genel" />;
  }

  const floor = await loadFloor(admin.restaurantId);

  return (
    <main className="adm-page">
      <header className="adm-head">
        <div className="adm-head-text">
          <span className="adm-eyebrow">Genel</span>
          <h1>Salon</h1>
          <p>Masaların anlık durumu. Bir masaya dokunarak siparişlerini, çağrılarını ve hesabını görün.</p>
        </div>
      </header>

      <FloorView initialFloor={floor} restaurantId={admin.restaurantId} canAct={!admin.isDemo} />
    </main>
  );
}
