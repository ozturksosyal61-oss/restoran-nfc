import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const checkoutReference = body.checkout_reference;
    const cardLastFour = body.card_last_four || "4242";

    if (
      !checkoutReference ||
      typeof checkoutReference !== "string"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "checkout_reference gerekli.",
        },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();

    // ---------------------------------------------------
    // ÖDEMEYİ BUL
    // ---------------------------------------------------

    const {
      data: payment,
      error: paymentError,
    } = await supabase
      .from("payment_transactions")
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
      .eq("checkout_reference", checkoutReference)
      .maybeSingle();

    if (paymentError) {
      console.error("PAYMENT LOOKUP ERROR:", paymentError);

      return NextResponse.json(
        {
          success: false,
          error: paymentError.message,
        },
        { status: 500 }
      );
    }

    if (!payment) {
      return NextResponse.json(
        {
          success: false,
          error: "Ödeme işlemi bulunamadı.",
        },
        { status: 404 }
      );
    }

    const changePlan =
      payment.raw_response?.change_plan === true;

    // ---------------------------------------------------
    // AYNI ÖDEME DAHA ÖNCE TAMAMLANDIYSA
    // ---------------------------------------------------

    if (payment.status === "success") {
      let existingSubscription = null;

      if (payment.subscription_id) {
        const { data } = await supabase
          .from("subscriptions")
          .select(`
            *,
            subscription_plans (
              id,
              name,
              slug,
              monthly_price,
              yearly_price
            )
          `)
          .eq("id", payment.subscription_id)
          .maybeSingle();

        existingSubscription = data;
      }

      return NextResponse.json({
        success: true,
        already_completed: true,
        message: "Bu ödeme zaten tamamlanmış.",
        payment,
        subscription: existingSubscription,
      });
    }

    // ---------------------------------------------------
    // BU DEMO ÖDEME BAŞKA BİR DURUMDA İŞLENİYORSA
    // ---------------------------------------------------

    if (payment.status !== "pending") {
      return NextResponse.json(
        {
          success: false,
          error: `Ödeme şu anda "${payment.status}" durumunda ve tekrar işlenemez.`,
        },
        { status: 409 }
      );
    }

    const normalizedCardLastFour =
      String(cardLastFour).replace(/\D/g, "").slice(-4) || "4242";

    // ---------------------------------------------------
    // DEMO ÖDEMEYİ BAŞARILI YAP
    // ---------------------------------------------------

    const { error: paymentUpdateError } = await supabase
      .from("payment_transactions")
      .update({
        status: "success",

        card_last_four: normalizedCardLastFour,

        paid_at: new Date().toISOString(),

        raw_response: {
          provider: "demo",
          simulated: true,
          result: "success",
          confirmed_at: new Date().toISOString(),
        },
      })
      .eq("id", payment.id)
      .eq("status", "pending");

    if (paymentUpdateError) {
      console.error(
        "PAYMENT UPDATE ERROR:",
        paymentUpdateError
      );

      return NextResponse.json(
        {
          success: false,
          error: paymentUpdateError.message,
        },
        { status: 500 }
      );
    }

    // ---------------------------------------------------
    // MEVCUT AKTİF / DENEME ABONELİĞİNİ PASİFLEŞTİR
    // Normal akışta burada kayıt olmamalıdır. Paket değişikliğinde
    // change_plan=true ile mevcut abonelik kapatılır.
    // ---------------------------------------------------

    const now = new Date();

    const { error: cancelError } = await supabase
      .from("subscriptions")
      .update({
        status: "cancelled",
        cancelled_at: now.toISOString(),
      })
      .eq("restaurant_id", payment.restaurant_id)
      .in("status", ["trial", "active"]);

    if (cancelError) {
      console.error(
        "OLD SUBSCRIPTION CANCEL ERROR:",
        cancelError
      );

      // Ödeme başarılı olduğu için burada işlemi tamamen
      // başarısız göstermiyoruz; yeni aboneliği yine oluşturuyoruz.
    }

    // ---------------------------------------------------
    // YENİ ABONELİK DÖNEMİ
    // ---------------------------------------------------

    const periodEnd = new Date(now);

    if (payment.billing_interval === "yearly") {
      periodEnd.setFullYear(
        periodEnd.getFullYear() + 1
      );
    } else {
      periodEnd.setMonth(
        periodEnd.getMonth() + 1
      );
    }

    // ---------------------------------------------------
    // YENİ ABONELİK
    // ---------------------------------------------------

    const {
      data: subscription,
      error: subscriptionError,
    } = await supabase
      .from("subscriptions")
      .insert({
        restaurant_id: payment.restaurant_id,

        plan_id: payment.plan_id,

        status: "active",

        billing_interval: payment.billing_interval,

        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
      })
      .select(`
        *,
        subscription_plans (
          id,
          name,
          slug,
          monthly_price,
          yearly_price
        )
      `)
      .single();

    if (subscriptionError) {
      console.error(
        "SUBSCRIPTION CREATE ERROR:",
        subscriptionError
      );

      return NextResponse.json(
        {
          success: false,
          error: subscriptionError.message,
          payment_status: "success",
          warning:
            "Ödeme başarılı oldu fakat abonelik oluşturulamadı. Veritabanı kontrolü gerekli.",
        },
        { status: 500 }
      );
    }

    // ---------------------------------------------------
    // PAYMENT → SUBSCRIPTION BAĞLANTISI
    // ---------------------------------------------------

    const {
      data: linkedPayment,
      error: linkError,
    } = await supabase
      .from("payment_transactions")
      .update({
        subscription_id: subscription.id,
      })
      .eq("id", payment.id)
      .select()
      .single();

    if (linkError || !linkedPayment) {
      console.error(
        "PAYMENT SUBSCRIPTION LINK ERROR:",
        linkError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            linkError?.message ||
            "Ödeme ile abonelik arasında bağlantı kurulamadı.",
          payment_status: "success",
          subscription_id: subscription.id,
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
        "Demo ödeme başarıyla tamamlandı.",

      payment: {
        id: linkedPayment.id,
        status: linkedPayment.status,
        amount: linkedPayment.amount,
        currency: linkedPayment.currency,
        card_last_four:
          normalizedCardLastFour,
        subscription_id:
          linkedPayment.subscription_id,
      },

      subscription,
      change_plan: changePlan,
    });
  } catch (error) {
    console.error("DEMO CONFIRM ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          "Ödeme doğrulanırken hata oluştu.",
      },
      { status: 500 }
    );
  }
}
