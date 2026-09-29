import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { supabase } from "../../../../lib/supabase";
import { readMenuOnly } from "../../../../lib/restaurant-type";
import { getAuroraPalette, normalizeRestaurantTheme } from "../../../../lib/themes";
import { auroraFontVariables } from "../aurora-fonts";
import palette from "../aurora-palette.module.css";
import FeedbackFlow from "./FeedbackFlow";

export const metadata: Metadata = {
  robots: { index: false },
};

// Müşteri deneyimini puanlar. Memnun misafir Google yorumuna davet edilir;
// herkes işletmeye özel not bırakabilir.
export default async function FeedbackPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id, name, slug, logo_url, theme, google_review_url")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (!restaurant) notFound();

  const menuOnly = await readMenuOnly(supabase, Number(restaurant.id));

  // Aurora dışı temalarda da bu sayfa Aurora görünümüyle (koyu) açılır.
  const auroraPalette = getAuroraPalette(normalizeRestaurantTheme(restaurant.theme));

  const googleUrl =
    typeof restaurant.google_review_url === "string" && /^https:\/\//i.test(restaurant.google_review_url.trim())
      ? restaurant.google_review_url.trim()
      : null;

  return (
    <div className={`${palette.shell} ${auroraFontVariables}`} data-palette={auroraPalette ?? undefined}>
      <FeedbackFlow
        slug={restaurant.slug}
        name={restaurant.name}
        logoUrl={restaurant.logo_url ?? null}
        googleUrl={googleUrl}
        menuOnly={menuOnly}
      />
    </div>
  );
}
