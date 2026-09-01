import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function GET(
  request: NextRequest
) {
  try {
    const restaurantId =
      Number(
        request.nextUrl.searchParams.get(
          "restaurant_id"
        )
      );

    if (
      !Number.isInteger(
        restaurantId
      ) ||
      restaurantId <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Geçerli bir restaurant_id gerekli.",
        },
        {
          status: 400,
        }
      );
    }

    const supabase =
      await createSupabaseServerClient();

    const now =
      new Date().toISOString();

    /*
    =====================================================
    SÜRESİ DOLAN TRIAL'LARI EXPIRED YAP
    =====================================================
    */

    await supabase
      .from("subscriptions")
      .update({
        status: "expired",
      })
      .eq(
        "restaurant_id",
        restaurantId
      )
      .eq(
        "status",
        "trial"
      )
      .not(
        "trial_ends_at",
        "is",
        null
      )
      .lt(
        "trial_ends_at",
        now
      );

    /*
    =====================================================
    SÜRESİ DOLAN ACTIVE ABONELİKLERİ EXPIRED YAP
    =====================================================
    */

    await supabase
      .from("subscriptions")
      .update({
        status: "expired",
      })
      .eq(
        "restaurant_id",
        restaurantId
      )
      .eq(
        "status",
        "active"
      )
      .not(
        "current_period_end",
        "is",
        null
      )
      .lt(
        "current_period_end",
        now
      );

    /*
    =====================================================
    GÜNCEL ABONELİĞİ BUL
    =====================================================
    */

    const {
      data: subscription,
      error,
    } =
      await supabase
        .from("subscriptions")
        .select(`
          *,
          subscription_plans (
            id,
            name,
            slug,
            monthly_price,
            yearly_price,
            trial_days,
            features
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

    if (error) {
      console.error(
        "SUBSCRIPTION STATUS ERROR:",
        error
      );

      return NextResponse.json(
        {
          success: false,
          error:
            error.message,
        },
        {
          status: 500,
        }
      );
    }

    /*
    =====================================================
    RESTAURANTS.PLAN SENKRONİZASYONU
    =====================================================
    */

    let restaurantPlan =
      "starter";

    if (subscription) {
      const plan =
        Array.isArray(
          subscription.subscription_plans
        )
          ? subscription
              .subscription_plans[0]
          : subscription
              .subscription_plans;

      if (
        plan?.slug === "pro" ||
        plan?.slug === "profesyonel"
      ) {
        restaurantPlan =
          "pro";
      }

      if (
        plan?.slug ===
        "premium"
      ) {
        restaurantPlan =
          "premium";
      }
    }

    await supabase
      .from("restaurants")
      .update({
        plan:
          restaurantPlan,
      })
      .eq(
        "id",
        restaurantId
      );

    return NextResponse.json({
      success: true,

      has_subscription:
        Boolean(
          subscription
        ),

      subscription:
        subscription ||
        null,

      status:
        subscription?.status ||
        "none",
    });
  } catch (error) {
    console.error(
      "SUBSCRIPTION STATUS ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Abonelik durumu alınamadı.",
      },
      {
        status: 500,
      }
    );
  }
}