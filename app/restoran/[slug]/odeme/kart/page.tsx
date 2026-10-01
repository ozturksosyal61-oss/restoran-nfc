import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { supabase } from "../../../../../lib/supabase";
import { getAuroraPalette, normalizeRestaurantTheme } from "../../../../../lib/themes";
import { auroraFontVariables } from "../../aurora-fonts";
import palette from "../../aurora-palette.module.css";
import TablePayFlow from "./TablePayFlow";

export const metadata: Metadata = {
  title: "Kartla öde",
  robots: { index: false },
};

// Masadan kartla ödeme. Aurora dışı temalarda da Aurora görünümüyle açılır.
export default async function TablePayPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("name, slug, theme")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (!restaurant) notFound();

  const auroraPalette = getAuroraPalette(normalizeRestaurantTheme(restaurant.theme));

  return (
    <div className={`${palette.shell} ${auroraFontVariables}`} data-palette={auroraPalette ?? undefined}>
      <Suspense>
        <TablePayFlow slug={restaurant.slug} restaurantName={restaurant.name} />
      </Suspense>
    </div>
  );
}
