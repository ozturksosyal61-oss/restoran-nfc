import { requireSystemAdmin } from "../../../lib/system-admin";
import { loadPlans, loadRestaurants, loadSubscriptions } from "../data";
import AbonelikYonetim from "./AbonelikYonetim";

export const dynamic = "force-dynamic";

// Kalan gün hesabı için istek anı; tarayıcı aynı değeri kullanır.
function requestTime() {
  return Date.now();
}

export default async function AboneliklerPage() {
  const { supabase } = await requireSystemAdmin();

  const [restaurants, plans, subscriptions] = await Promise.all([
    loadRestaurants(supabase),
    loadPlans(supabase),
    loadSubscriptions(supabase),
  ]);

  return (
    <AbonelikYonetim
      restaurants={restaurants.map((restaurant) => ({
        id: restaurant.id,
        name: restaurant.name,
        slug: restaurant.slug,
        menuOnly: restaurant.menu_only,
        isActive: restaurant.is_active,
      }))}
      plans={plans}
      subscriptions={subscriptions}
      now={requestTime()}
    />
  );
}
