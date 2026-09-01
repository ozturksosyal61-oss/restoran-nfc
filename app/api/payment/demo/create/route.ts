import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const restaurantId =
      Number(body.restaurant_id);

    const planId =
      body.plan_id;

    const billingInterval =
      body.billing_interval || "monthly";

    if (
      !Number.isInteger(restaurantId) ||
      restaurantId <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Geçerli bir restaurant_id gerekli.",
        },
        { status: 400 }
      );
    }

    if (
      !planId ||
      typeof planId !== "string"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Geçerli bir plan_id gerekli.",
        },
        { status: 400 }
      );
    }

    if (
      !["monthly", "yearly"].includes(
        billingInterval
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Geçersiz ödeme periyodu.",
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
    } =
      await supabase
        .from("restaurants")
        .select("id, name, slug")
        .eq("id", restaurantId)
        .maybeSingle();

    if (restaurantError) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Restoran bilgisi alınamadı.",
        },
        { status: 500 }
      );
    }

    if (!restaurant) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Restoran bulunamadı.",
        },
        { status: 404 }
      );
    }

    // ---------------------------------------------------
    // MEVCUT ABONELİK KONTROLÜ
    // ---------------------------------------------------

    const {
      data: existingSubscription,
      error: subscriptionError,
    } =
      await supabase
        .from("subscriptions")
        .select(`
          id,
          status,
          trial_ends_at,
          current_period_end,
          plan_id
        `)
        .eq("restaurant_id", restaurantId)
        .in("status", ["trial", "active"])
        .order("current_period_end", {
          ascending: false,
          nullsFirst: false,
        })
        .maybeSingle();

    if (subscriptionError) {
      console.error(
        "EXISTING SUBSCRIPTION ERROR:",
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

    if (existingSubscription) {
      const now = new Date();

      const endDate =
        existingSubscription.status ===
        "trial"
          ? existingSubscription.trial_ends_at
          : existingSubscription.current_period_end;

      // Süresi dolmuşsa expired yap
      if (
        endDate &&
        new Date(endDate) <= now
      ) {
        await supabase
          .from("subscriptions")
          .update({
            status: "expired",
          })
          .eq(
            "id",
            existingSubscription.id
          );
      } else {
        return NextResponse.json(
          {
            success: false,
            code:
              "ACTIVE_SUBSCRIPTION_EXISTS",
            error:
              "Bu restoranın zaten aktif bir aboneliği bulunuyor.",
          },
          { status: 409 }
        );
      }
    }

    // ---------------------------------------------------
    // PLAN
    // ---------------------------------------------------

    const {
      data: plan,
      error: planError,
    } =
      await supabase
        .from("subscription_plans")
        .select("*")
        .eq("id", planId)
        .eq("is_active", true)
        .single();

    if (planError || !plan) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Paket bulunamadı.",
        },
        { status: 404 }
      );
    }

    // ---------------------------------------------------
    // FİYAT
    // ---------------------------------------------------

    const amount =
      billingInterval === "monthly"
        ? Number(plan.monthly_price)
        : Number(plan.yearly_price);

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Paket fiyatı geçersiz.",
        },
        { status: 400 }
      );
    }

    // ---------------------------------------------------
    // CHECKOUT REFERENCE
    // ---------------------------------------------------

    const checkoutReference =
      `DEMO-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 9)
        .toUpperCase()}`;

    // ---------------------------------------------------
    // PAYMENT
    // ---------------------------------------------------

    const {
      data: payment,
      error,
    } =
      await supabase
        .from("payment_transactions")
        .insert({
          restaurant_id:
            restaurantId,

          plan_id:
            plan.id,

          provider:
            "demo",

          provider_reference_code:
            checkoutReference,

          checkout_reference:
            checkoutReference,

          amount,

          currency:
            "TRY",

          status:
            "pending",

          payment_type:
            "subscription",

          payment_method:
            "demo_card",

          billing_interval:
            billingInterval,
        })
        .select()
        .single();

    if (error) {
      console.error(
        "DEMO PAYMENT CREATE ERROR:",
        error
      );

      return NextResponse.json(
        {
          success: false,
          error:
            error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,

      checkout_reference:
        checkoutReference,

      payment_id:
        payment.id,

      restaurant: {
        id:
          restaurant.id,

        name:
          restaurant.name,
      },

      plan: {
        id:
          plan.id,

        name:
          plan.name,

        price:
          amount,

        currency:
          "TRY",
      },

      billing_interval:
        billingInterval,
    });
  } catch (error) {
    console.error(
      "DEMO PAYMENT ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Ödeme işlemi başlatılamadı.",
      },
      { status: 500 }
    );
  }
}