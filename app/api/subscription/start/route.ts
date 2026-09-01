import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const restaurantId = Number(body.restaurant_id);
    const planId = body.plan_id;
    const billingInterval =
      body.billing_interval || "monthly";

    // ---------------------------------------------------
    // VALIDATION
    // ---------------------------------------------------

    if (!Number.isInteger(restaurantId) || restaurantId <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Geçerli bir restaurant_id gerekli.",
        },
        { status: 400 }
      );
    }

    if (!planId || typeof planId !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "Geçerli bir plan_id gerekli.",
        },
        { status: 400 }
      );
    }

    if (!["monthly", "yearly"].includes(billingInterval)) {
      return NextResponse.json(
        {
          success: false,
          error: "Geçersiz ödeme periyodu.",
        },
        { status: 400 }
      );
    }

    const supabase =
      await createSupabaseServerClient();

    // ---------------------------------------------------
    // RESTORAN
    // ---------------------------------------------------

    const {
      data: restaurant,
      error: restaurantError,
    } = await supabase
      .from("restaurants")
      .select("id, name, slug")
      .eq("id", restaurantId)
      .maybeSingle();

    if (restaurantError) {
      console.error(
        "RESTAURANT LOOKUP ERROR:",
        restaurantError
      );

      return NextResponse.json(
        {
          success: false,
          error: "Restoran bilgisi alınamadı.",
        },
        { status: 500 }
      );
    }

    if (!restaurant) {
      return NextResponse.json(
        {
          success: false,
          error: "Restoran bulunamadı.",
        },
        { status: 404 }
      );
    }

    // ---------------------------------------------------
    // PLAN
    // ---------------------------------------------------

    const {
      data: plan,
      error: planError,
    } = await supabase
      .from("subscription_plans")
      .select("*")
      .eq("id", planId)
      .eq("is_active", true)
      .single();

    if (planError) {
      console.error(
        "PLAN LOOKUP ERROR:",
        planError
      );

      return NextResponse.json(
        {
          success: false,
          error: "Paket bilgisi alınamadı.",
        },
        { status: 500 }
      );
    }

    if (!plan) {
      return NextResponse.json(
        {
          success: false,
          error: "Paket bulunamadı.",
        },
        { status: 404 }
      );
    }

    // ---------------------------------------------------
    // MEVCUT AKTİF / TRIAL ABONELİK KONTROLÜ
    // ---------------------------------------------------

    const {
      data: existingSubscription,
      error: existingError,
    } = await supabase
      .from("subscriptions")
      .select(`
        id,
        restaurant_id,
        plan_id,
        status,
        billing_interval,
        trial_started_at,
        trial_ends_at,
        current_period_start,
        current_period_end,
        cancelled_at
      `)
      .eq("restaurant_id", restaurantId)
      .in("status", ["trial", "active"])
      .order("current_period_start", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

    if (existingError) {
      console.error(
        "EXISTING SUBSCRIPTION LOOKUP ERROR:",
        existingError
      );

      return NextResponse.json(
        {
          success: false,
          error: "Mevcut abonelik kontrol edilemedi.",
        },
        { status: 500 }
      );
    }

    if (existingSubscription) {
      return NextResponse.json(
        {
          success: false,
          code: "ACTIVE_SUBSCRIPTION",
          error:
            "Bu restoranın zaten aktif bir aboneliği veya devam eden ücretsiz denemesi bulunuyor.",
          subscription: existingSubscription,
        },
        { status: 409 }
      );
    }

    // ---------------------------------------------------
    // TRIAL SÜRESİ
    // ---------------------------------------------------

    const trialDays =
      Number(plan.trial_days) > 0
        ? Number(plan.trial_days)
        : 14;

    const now = new Date();

    const trialEnd = new Date(now);

    trialEnd.setDate(
      trialEnd.getDate() + trialDays
    );

    // ---------------------------------------------------
    // ÜCRETSİZ DENEME ABONELİĞİ OLUŞTUR
    // ---------------------------------------------------

    const {
      data: subscription,
      error: subscriptionError,
    } = await supabase
      .from("subscriptions")
      .insert({
        restaurant_id: restaurantId,

        plan_id: plan.id,

        status: "trial",

        billing_interval:
          billingInterval,

        trial_started_at:
          now.toISOString(),

        trial_ends_at:
          trialEnd.toISOString(),

        current_period_start:
          now.toISOString(),

        current_period_end:
          trialEnd.toISOString(),

        cancelled_at: null,
      })
      .select(`
        *,
        subscription_plans (
          id,
          name,
          slug,
          monthly_price,
          yearly_price,
          trial_days
        )
      `)
      .single();

    if (subscriptionError) {
      console.error(
        "TRIAL SUBSCRIPTION CREATE ERROR:",
        subscriptionError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            subscriptionError.message,
        },
        { status: 500 }
      );
    }

    // ---------------------------------------------------
    // BAŞARILI
    // ---------------------------------------------------

    return NextResponse.json({
      success: true,

      message:
        `${trialDays} günlük ücretsiz deneme başarıyla başlatıldı.`,

      subscription,

      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
        slug: restaurant.slug,
      },

      plan: {
        id: plan.id,
        name: plan.name,
        slug: plan.slug,
        trial_days: trialDays,
        billing_interval:
          billingInterval,
      },

      trial: {
        started_at:
          now.toISOString(),

        ends_at:
          trialEnd.toISOString(),

        days: trialDays,
      },
    });
  } catch (error) {
    console.error(
      "START TRIAL ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Ücretsiz deneme başlatılamadı.",
      },
      { status: 500 }
    );
  }
}