import { redirect } from "next/navigation";
import Link from "next/link";

import {
  createSupabaseServerClient,
} from "../../../lib/supabase-server";

import AbonelikYonetim from "./AbonelikYonetim";

import {
  updateSubscription,
  createSubscription,
  deleteSubscription,
} from "./actions";

type Restaurant = {
  id: number;
  name: string;
  slug: string;
};

type Plan = {
  id: string;
  name: string;
  slug: string;
  monthly_price: number;
  yearly_price: number;
};

type Subscription = {
  id: string;
  restaurant_id: number;
  plan_id: string;
  status: string;
  billing_interval: string;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancelled_at: string | null;

  subscription_plans?: {
    id: string;
    name: string;
    slug: string;
    monthly_price: number;
    yearly_price: number;
  } | null;
};

export default async function AboneliklerPage() {
  const supabase =
    await createSupabaseServerClient();

  /*
  =====================================================
  GİRİŞ
  =====================================================
  */

  const {
    data: {
      user,
    },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      "/sistem/login"
    );
  }

  /*
  =====================================================
  SİSTEM SAHİBİ
  =====================================================
  */

  const {
    data: systemAdmin,
  } = await supabase
    .from("system_admins")
    .select("user_id")
    .eq(
      "user_id",
      user.id
    )
    .maybeSingle();

  if (!systemAdmin) {
    redirect("/admin");
  }

  /*
  =====================================================
  RESTORANLAR
  =====================================================
  */

  const {
    data: restaurants,
    error:
      restaurantsError,
  } = await supabase
    .from("restaurants")
    .select(
      "id, name, slug"
    )
    .order(
      "name",
      {
        ascending: true,
      }
    );

  if (restaurantsError) {
    throw new Error(
      restaurantsError.message
    );
  }

  /*
  =====================================================
  PLANLAR
  =====================================================
  */

  const {
    data: plans,
    error:
      plansError,
  } = await supabase
    .from(
      "subscription_plans"
    )
    .select(
      `
        id,
        name,
        slug,
        monthly_price,
        yearly_price
      `
    )
    .order(
      "monthly_price",
      {
        ascending: true,
      }
    );

  if (plansError) {
    throw new Error(
      plansError.message
    );
  }

  /*
  =====================================================
  ABONELİKLER
  =====================================================
  */

  const {
    data: subscriptions,
    error:
      subscriptionsError,
  } = await supabase
    .from("subscriptions")
    .select(
      `
        id,
        restaurant_id,
        plan_id,
        status,
        billing_interval,
        trial_started_at,
        trial_ends_at,
        current_period_start,
        current_period_end,
        cancelled_at,

        subscription_plans (
          id,
          name,
          slug,
          monthly_price,
          yearly_price
        )
      `
    )
    .order(
      "current_period_start",
      {
        ascending: false,
        nullsFirst: false,
      }
    );

  if (subscriptionsError) {
    throw new Error(
      subscriptionsError.message
    );
  }

  return (
    <>
      <div
        style={{
          padding:
            "18px 20px 0",
          background:
            "#f4f2ed",
        }}
      >
        <div
          style={{
            width:
              "min(1200px,100%)",
            margin:
              "0 auto",
          }}
        >
          <Link
            href="/sistem"
            style={{
              display:
                "inline-flex",
              alignItems:
                "center",
              gap: "7px",
              color:
                "#777",
              textDecoration:
                "none",
              fontSize:
                "12px",
              fontWeight:
                800,
            }}
          >
            ← Sistem Paneli
          </Link>
        </div>
      </div>

      <AbonelikYonetim
        restaurants={
          (restaurants ??
            []) as Restaurant[]
        }
        plans={
          (plans ??
            []) as Plan[]
        }
        subscriptions={
  (subscriptions ?? []).map((subscription) => ({
    ...subscription,
    subscription_plans:
      Array.isArray(
        subscription.subscription_plans
      )
        ? subscription.subscription_plans[0] ?? null
        : subscription.subscription_plans ?? null,
  })) as Subscription[]
}
        updateSubscription={
          updateSubscription
        }
        createSubscription={
          createSubscription
        }
        deleteSubscription={
          deleteSubscription
        }
      />
    </>
  );
}