import { notFound, redirect } from "next/navigation";
import { requireSystemAdmin } from "../../../../lib/system-admin";

// Eski yönetici detay bağlantıları restoranın sayfasına yönlenir; yönetici
// giriş bilgileri artık orada yönetiliyor.
export default async function YoneticiDetayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await requireSystemAdmin();

  const { data: manager } = await supabase
    .from("restaurant_users")
    .select("restaurant_id")
    .eq("id", id)
    .maybeSingle();

  if (!manager?.restaurant_id) notFound();

  redirect(`/sistem/restoran/${manager.restaurant_id}`);
}
