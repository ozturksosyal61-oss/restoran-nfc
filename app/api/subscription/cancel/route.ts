import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const restaurantId = Number(body.restaurant_id);

    if (!Number.isInteger(restaurantId) || restaurantId <= 0) {
      return NextResponse.json(
        { success: false, error: "Geçerli bir restaurant_id gerekli." },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();
    const now = new Date().toISOString();

    const { data: subscription, error: findError } = await supabase
      .from("subscriptions")
      .select("id, status")
      .eq("restaurant_id", restaurantId)
      .in("status", ["trial", "active"])
      .order("current_period_start", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (findError) {
      return NextResponse.json(
        { success: false, error: findError.message },
        { status: 500 }
      );
    }

    if (!subscription) {
      return NextResponse.json(
        { success: false, error: "Aktif abonelik bulunamadı." },
        { status: 404 }
      );
    }

    const { data: cancelled, error: updateError } = await supabase
      .from("subscriptions")
      .update({
        status: "cancelled",
        cancelled_at: now,
      })
      .eq("id", subscription.id)
      .in("status", ["trial", "active"])
      .select()
      .single();

    if (updateError) {
      console.error("SUBSCRIPTION CANCEL ERROR:", updateError);
      return NextResponse.json(
        { success: false, error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Abonelik başarıyla iptal edildi.",
      subscription: cancelled,
    });
  } catch (error) {
    console.error("SUBSCRIPTION CANCEL ERROR:", error);
    return NextResponse.json(
      { success: false, error: "Abonelik iptal edilemedi." },
      { status: 500 }
    );
  }
}
