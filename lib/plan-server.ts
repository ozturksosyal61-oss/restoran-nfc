import { createSupabaseServerClient } from "./supabase-server";

import {
  normalizePlan,
  hasPlanFeature,
  getPlanFeatures,
  getPlanLabel,
  type Plan,
  type PlanFeature,
} from "./plan";

type RestaurantPlanResult = {
  restaurantId: number | null;
  plan: Plan;
};

export async function getCurrentRestaurantPlan(): Promise<RestaurantPlanResult> {
  const supabase =
    await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      restaurantId: null,
      plan: "starter",
    };
  }

  const { data: membership } =
    await supabase
      .from("restaurant_users")
      .select("restaurant_id")
      .eq("user_id", user.id)
      .single();

  if (
    !membership?.restaurant_id
  ) {
    return {
      restaurantId: null,
      plan: "starter",
    };
  }

  const restaurantId = Number(
    membership.restaurant_id
  );

  if (!Number.isInteger(restaurantId)) {
    return {
      restaurantId: null,
      plan: "starter",
    };
  }

  const { data: restaurant } =
    await supabase
      .from("restaurants")
      .select("plan")
      .eq("id", restaurantId)
      .single();

  return {
    restaurantId,
    plan: normalizePlan(
      restaurant?.plan
    ),
  };
}

export async function currentRestaurantHasFeature(
  feature: PlanFeature
): Promise<boolean> {
  const { plan } =
    await getCurrentRestaurantPlan();

  return hasPlanFeature(
    plan,
    feature
  );
}

export async function getCurrentRestaurantFeatures(): Promise<
  PlanFeature[]
> {
  const { plan } =
    await getCurrentRestaurantPlan();

  return getPlanFeatures(plan);
}

export async function getCurrentRestaurantPlanLabel(): Promise<string> {
  const { plan } =
    await getCurrentRestaurantPlan();

  return getPlanLabel(plan);
}