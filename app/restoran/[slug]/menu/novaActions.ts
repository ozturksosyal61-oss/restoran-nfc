"use server";

import { redirect } from "next/navigation";
import { supabase } from "../../../../lib/supabase";

type RequestType = "garson" | "hesap";

async function createPublicRequest(
  formData: FormData,
  requestType: RequestType
) {
  const slug = String(formData.get("slug") || "").trim();
  const masa = String(formData.get("masa") || "").trim();

  if (!slug || !masa) {
    return;
  }

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (!restaurant) {
    redirect(
      `/restoran/${encodeURIComponent(slug)}/menu?masa=${encodeURIComponent(masa)}&${requestType}=hata`
    );
  }

  const { data: table } = await supabase
    .from("restaurant_tables")
    .select("id")
    .eq("restaurant_id", restaurant.id)
    .eq("public_token", masa)
    .eq("is_active", true)
    .maybeSingle();

  if (!table) {
    redirect(
      `/restoran/${encodeURIComponent(slug)}/menu?masa=${encodeURIComponent(masa)}&${requestType}=hata`
    );
  }

  const { error } = await supabase.rpc(
    "create_public_service_request",
    {
      p_restaurant_id: restaurant.id,
      p_table_id: table.id,
      p_request_type: requestType,
    }
  );

  if (error) {
    console.error(
      `Nova ${requestType} talebi hatası:`,
      error
    );

    redirect(
      `/restoran/${encodeURIComponent(slug)}/menu?masa=${encodeURIComponent(masa)}&${requestType}=hata`
    );
  }

  redirect(
    `/restoran/${encodeURIComponent(slug)}/menu?masa=${encodeURIComponent(masa)}&${requestType}=ok`
  );
}

export async function callNovaWaiter(formData: FormData) {
  await createPublicRequest(formData, "garson");
}

export async function requestNovaBill(formData: FormData) {
  await createPublicRequest(formData, "hesap");
}
