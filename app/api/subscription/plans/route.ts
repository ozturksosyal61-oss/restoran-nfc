import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("subscription_plans")
      .select(`
        id,
        name,
        slug,
        description,
        monthly_price,
        yearly_price,
        currency,
        trial_days,
        features,
        is_active
      `)
      .eq("is_active", true)
      .order("monthly_price", {
        ascending: true,
      });

    if (error) {
      console.error(
        "SUBSCRIPTION PLANS ERROR:",
        error
      );

      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      plans: data ?? [],
    });
  } catch (error) {
    console.error(
      "PLANS API ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Paketler alınırken bir hata oluştu.",
      },
      { status: 500 }
    );
  }
}