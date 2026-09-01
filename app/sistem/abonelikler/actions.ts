"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../../lib/supabase-server";

const VALID_STATUSES = [
  "trial",
  "active",
  "cancelled",
  "expired",
];

const VALID_INTERVALS = [
  "monthly",
  "yearly",
];

async function getSystemAdmin() {
  const supabase =
    await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sistem/login");
  }

  const { data: systemAdmin } =
    await supabase
      .from("system_admins")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

  if (!systemAdmin) {
    redirect("/admin");
  }

  return supabase;
}

/*
=====================================================
RESTAURANTS.PLAN SENKRONİZASYONU
=====================================================
*/

async function syncRestaurantPlan(
  supabase: any,
  restaurantId: number
) {
  /*
    Önce halen geçerli bir trial / active abonelik
    var mı kontrol ediyoruz.
  */

  const { data: activeSubscription } =
    await supabase
      .from("subscriptions")
      .select(`
        id,
        status,
        plan_id,
        subscription_plans (
          slug
        )
      `)
      .eq(
        "restaurant_id",
        restaurantId
      )
      .in(
        "status",
        ["trial", "active"]
      )
      .order(
        "current_period_start",
        {
          ascending: false,
          nullsFirst: false,
        }
      )
      .limit(1)
      .maybeSingle();

  let restaurantPlan = "starter";

  if (activeSubscription) {
    const plan =
      Array.isArray(
        activeSubscription.subscription_plans
      )
        ? activeSubscription
            .subscription_plans[0]
        : activeSubscription
            .subscription_plans;

    if (
      plan?.slug === "pro" ||
      plan?.slug === "profesyonel"
    ) {
      restaurantPlan = "pro";
    }

    if (
      plan?.slug === "premium"
    ) {
      restaurantPlan = "premium";
    }
  }

  await supabase
    .from("restaurants")
    .update({
      plan: restaurantPlan,
    })
    .eq(
      "id",
      restaurantId
    );

  return restaurantPlan;
}

/*
=====================================================
DİĞER AKTİF ABONELİKLERİ KAPAT
=====================================================
*/

async function closeOtherActiveSubscriptions(
  supabase: any,
  restaurantId: number,
  exceptSubscriptionId?: string
) {
  let query = supabase
    .from("subscriptions")
    .update({
      status: "cancelled",
      cancelled_at:
        new Date().toISOString(),
    })
    .eq(
      "restaurant_id",
      restaurantId
    )
    .in(
      "status",
      ["trial", "active"]
    );

  if (exceptSubscriptionId) {
    query = query.neq(
      "id",
      exceptSubscriptionId
    );
  }

  await query;
}

/*
=====================================================
ABONELİK GÜNCELLE
=====================================================
*/

export async function updateSubscription(
  formData: FormData
) {
  const subscriptionId =
    String(
      formData.get(
        "subscription_id"
      ) || ""
    );

  const restaurantId =
    Number(
      formData.get(
        "restaurant_id"
      )
    );

  const planId =
    String(
      formData.get(
        "plan_id"
      ) || ""
    );

  const status =
    String(
      formData.get(
        "status"
      ) || ""
    ).toLowerCase();

  const billingInterval =
    String(
      formData.get(
        "billing_interval"
      ) || "monthly"
    ).toLowerCase();

  if (!subscriptionId) {
    return;
  }

  if (
    !Number.isInteger(
      restaurantId
    ) ||
    restaurantId <= 0
  ) {
    return;
  }

  if (
    !VALID_STATUSES.includes(
      status
    )
  ) {
    return;
  }

  if (
    !VALID_INTERVALS.includes(
      billingInterval
    )
  ) {
    return;
  }

  if (!planId) {
    return;
  }

  const supabase =
    await getSystemAdmin();

  /*
  ---------------------------------------------------
  RESTORAN
  ---------------------------------------------------
  */

  const { data: restaurant } =
    await supabase
      .from("restaurants")
      .select("id")
      .eq(
        "id",
        restaurantId
      )
      .maybeSingle();

  if (!restaurant) {
    return;
  }

  /*
  ---------------------------------------------------
  PLAN
  ---------------------------------------------------
  */

  const { data: plan } =
    await supabase
      .from(
        "subscription_plans"
      )
      .select(
        "id, slug"
      )
      .eq(
        "id",
        planId
      )
      .maybeSingle();

  if (!plan) {
    return;
  }

  const now =
    new Date();

  const updateData:
    Record<
      string,
      string | null
    > = {
      plan_id:
        planId,

      status,

      billing_interval:
        billingInterval,
    };

  /*
  ---------------------------------------------------
  BAŞKA AKTİF/TRIAL VARSA KAPAT
  ---------------------------------------------------
  */

  if (
    status === "trial" ||
    status === "active"
  ) {
    await closeOtherActiveSubscriptions(
      supabase,
      restaurantId,
      subscriptionId
    );
  }

  /*
  ---------------------------------------------------
  TRIAL
  ---------------------------------------------------
  */

  if (
    status === "trial"
  ) {
    const trialEnds =
      new Date(now);

    trialEnds.setDate(
      trialEnds.getDate() +
        14
    );

    updateData.trial_started_at =
      now.toISOString();

    updateData.trial_ends_at =
      trialEnds.toISOString();

    updateData.current_period_start =
      null;

    updateData.current_period_end =
      null;

    updateData.cancelled_at =
      null;
  }

  /*
  ---------------------------------------------------
  ACTIVE
  ---------------------------------------------------
  */

  if (
    status === "active"
  ) {
    const periodEnd =
      new Date(now);

    if (
      billingInterval ===
      "yearly"
    ) {
      periodEnd.setFullYear(
        periodEnd.getFullYear() +
          1
      );
    } else {
      periodEnd.setMonth(
        periodEnd.getMonth() +
          1
      );
    }

    updateData.trial_started_at =
      null;

    updateData.trial_ends_at =
      null;

    updateData.current_period_start =
      now.toISOString();

    updateData.current_period_end =
      periodEnd.toISOString();

    updateData.cancelled_at =
      null;
  }

  /*
  ---------------------------------------------------
  CANCELLED
  ---------------------------------------------------
  */

  if (
    status === "cancelled"
  ) {
    updateData.cancelled_at =
      now.toISOString();
  }

  /*
  ---------------------------------------------------
  EXPIRED
  ---------------------------------------------------
  */

  if (
    status === "expired"
  ) {
    updateData.cancelled_at =
      null;
  }

  /*
  ---------------------------------------------------
  GÜNCELLE
  ---------------------------------------------------
  */

  const { error } =
    await supabase
      .from("subscriptions")
      .update(
        updateData
      )
      .eq(
        "id",
        subscriptionId
      )
      .eq(
        "restaurant_id",
        restaurantId
      );

  if (error) {
    console.error(
      "SUBSCRIPTION UPDATE ERROR:",
      error
    );

    return;
  }

  /*
  ---------------------------------------------------
  RESTAURANT PLAN SENKRONİZASYONU
  ---------------------------------------------------
  */

  await syncRestaurantPlan(
    supabase,
    restaurantId
  );

  revalidatePath(
    "/sistem"
  );

  revalidatePath(
    "/sistem/abonelikler"
  );

  revalidatePath(
    "/abonelik"
  );
}

/*
=====================================================
YENİ ABONELİK OLUŞTUR
=====================================================
*/

export async function createSubscription(
  formData: FormData
) {
  const restaurantId =
    Number(
      formData.get(
        "restaurant_id"
      )
    );

  const planId =
    String(
      formData.get(
        "plan_id"
      ) || ""
    );

  const status =
    String(
      formData.get(
        "status"
      ) || "trial"
    ).toLowerCase();

  const billingInterval =
    String(
      formData.get(
        "billing_interval"
      ) || "monthly"
    ).toLowerCase();

  if (
    !Number.isInteger(
      restaurantId
    ) ||
    restaurantId <= 0
  ) {
    return;
  }

  if (!planId) {
    return;
  }

  if (
    !VALID_STATUSES.includes(
      status
    )
  ) {
    return;
  }

  if (
    !VALID_INTERVALS.includes(
      billingInterval
    )
  ) {
    return;
  }

  const supabase =
    await getSystemAdmin();

  /*
  ---------------------------------------------------
  RESTORAN
  ---------------------------------------------------
  */

  const { data: restaurant } =
    await supabase
      .from("restaurants")
      .select("id")
      .eq(
        "id",
        restaurantId
      )
      .maybeSingle();

  if (!restaurant) {
    return;
  }

  /*
  ---------------------------------------------------
  PLAN
  ---------------------------------------------------
  */

  const { data: plan } =
    await supabase
      .from(
        "subscription_plans"
      )
      .select(
        "id, slug"
      )
      .eq(
        "id",
        planId
      )
      .maybeSingle();

  if (!plan) {
    return;
  }

  /*
  ---------------------------------------------------
  MEVCUT AKTİF/TRIAL ABONELİĞİ KAPAT
  ---------------------------------------------------
  */

  await closeOtherActiveSubscriptions(
    supabase,
    restaurantId
  );

  /*
  ---------------------------------------------------
  TARİHLER
  ---------------------------------------------------
  */

  const now =
    new Date();

  let trialStartedAt:
    | string
    | null = null;

  let trialEndsAt:
    | string
    | null = null;

  let currentPeriodStart:
    | string
    | null = null;

  let currentPeriodEnd:
    | string
    | null = null;

  let cancelledAt:
    | string
    | null = null;

  if (
    status === "trial"
  ) {
    const end =
      new Date(now);

    end.setDate(
      end.getDate() +
        14
    );

    trialStartedAt =
      now.toISOString();

    trialEndsAt =
      end.toISOString();
  }

  if (
    status === "active"
  ) {
    const end =
      new Date(now);

    if (
      billingInterval ===
      "yearly"
    ) {
      end.setFullYear(
        end.getFullYear() +
          1
      );
    } else {
      end.setMonth(
        end.getMonth() +
          1
      );
    }

    currentPeriodStart =
      now.toISOString();

    currentPeriodEnd =
      end.toISOString();
  }

  if (
    status === "cancelled"
  ) {
    cancelledAt =
      now.toISOString();
  }

  /*
  ---------------------------------------------------
  ABONELİK OLUŞTUR
  ---------------------------------------------------
  */

  const { error } =
    await supabase
      .from("subscriptions")
      .insert({
        restaurant_id:
          restaurantId,

        plan_id:
          planId,

        status,

        billing_interval:
          billingInterval,

        trial_started_at:
          trialStartedAt,

        trial_ends_at:
          trialEndsAt,

        current_period_start:
          currentPeriodStart,

        current_period_end:
          currentPeriodEnd,

        cancelled_at:
          cancelledAt,
      });

  if (error) {
    console.error(
      "SUBSCRIPTION CREATE ERROR:",
      error
    );

    return;
  }

  /*
  ---------------------------------------------------
  PLAN SENKRONİZASYONU
  ---------------------------------------------------
  */

  await syncRestaurantPlan(
    supabase,
    restaurantId
  );

  revalidatePath(
    "/sistem"
  );

  revalidatePath(
    "/sistem/abonelikler"
  );

  revalidatePath(
    "/abonelik"
  );
}

/*
=====================================================
ABONELİK SİL
=====================================================
*/

export async function deleteSubscription(
  formData: FormData
) {
  const subscriptionId =
    String(
      formData.get(
        "subscription_id"
      ) || ""
    );

  if (!subscriptionId) {
    return;
  }

  const supabase =
    await getSystemAdmin();

  /*
  ---------------------------------------------------
  ABONELİK RESTORANINI BUL
  ---------------------------------------------------
  */

  const { data: subscription } =
    await supabase
      .from("subscriptions")
      .select(
        "id, restaurant_id"
      )
      .eq(
        "id",
        subscriptionId
      )
      .maybeSingle();

  if (!subscription) {
    return;
  }

  const restaurantId =
    subscription.restaurant_id;

  /*
  ---------------------------------------------------
  ÖDEME BAĞLANTISI
  ---------------------------------------------------
  */

  const { count } =
    await supabase
      .from(
        "payment_transactions"
      )
      .select(
        "id",
        {
          count: "exact",
          head: true,
        }
      )
      .eq(
        "subscription_id",
        subscriptionId
      );

  if (
    count &&
    count > 0
  ) {
    console.error(
      "Bu abonelik ödeme kayıtlarına bağlı olduğu için silinemez."
    );

    return;
  }

  /*
  ---------------------------------------------------
  SİL
  ---------------------------------------------------
  */

  const { error } =
    await supabase
      .from("subscriptions")
      .delete()
      .eq(
        "id",
        subscriptionId
      );

  if (error) {
    console.error(
      "SUBSCRIPTION DELETE ERROR:",
      error
    );

    return;
  }

  /*
  ---------------------------------------------------
  PLAN SENKRONİZASYONU
  ---------------------------------------------------
  */

  await syncRestaurantPlan(
    supabase,
    restaurantId
  );

  revalidatePath(
    "/sistem"
  );

  revalidatePath(
    "/sistem/abonelikler"
  );

  revalidatePath(
    "/abonelik"
  );
}