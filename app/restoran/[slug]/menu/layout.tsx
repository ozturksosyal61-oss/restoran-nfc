import { supabase } from "../../../../lib/supabase";
import OztNovaPremiumMenu from "./OztNovaPremiumMenu";
import AuroraMenu from "./AuroraMenu";

export default async function RestaurantMenuRouteLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{
    slug: string;
  }>;
}) {
  const { slug } = await params;

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("theme")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (restaurant?.theme === "aurora") {
    return <AuroraMenu slug={slug} />;
  }

  if (restaurant?.theme === "ozt-nova-premium") {
    return <OztNovaPremiumMenu slug={slug} />;
  }

  return <>{children}</>;
}
