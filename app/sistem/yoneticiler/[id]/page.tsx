import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../../../lib/supabase-server";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function YoneticDetayPage({
  params,
}: Props) {
  const { id } = await params;

  const supabase =
    await createSupabaseServerClient();

  // =========================================================
  // OTURUM
  // =========================================================

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sistem/login");
  }

  // =========================================================
  // SİSTEM SAHİBİ
  // =========================================================

  const { data: systemAdmin } =
    await supabase
      .from("system_admins")
      .select("user_id")
      .eq("user_id", user.id)
      .single();

  if (!systemAdmin) {
    redirect("/admin");
  }

  // =========================================================
  // YÖNETİCİ
  // =========================================================

  const { data: manager, error } =
    await supabase
      .from("restaurant_users")
      .select(`
        id,
        user_id,
        restaurant_id,
        role,
        created_at,
        restaurants (
          id,
          name,
          slug,
          description,
          logo_url,
          instagram_url,
          google_review_url
        )
      `)
      .eq("id", id)
      .single();

  if (error || !manager) {
    return (
      <main className="min-h-screen bg-[#f5f3ef] px-4 py-10">
        <div className="mx-auto max-w-4xl">

          <Link
            href="/sistem/yoneticiler"
            className="text-sm font-bold text-gray-600"
          >
            ← Yöneticilere Dön
          </Link>

          <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-8">
            <h1 className="text-xl font-black text-red-700">
              Yönetici bulunamadı
            </h1>

            <p className="mt-2 text-sm text-red-600">
              Bu yönetici kaydı bulunamadı veya silinmiş olabilir.
            </p>
          </div>

        </div>
      </main>
    );
  }

  const restaurant =
    Array.isArray(manager.restaurants)
      ? manager.restaurants[0]
      : manager.restaurants;

  return (
    <main className="min-h-screen bg-[#f5f3ef] px-4 py-10">
      <div className="mx-auto max-w-4xl">

        {/* HEADER */}

        <div className="mb-8">

          <Link
            href="/sistem/yoneticiler"
            className="text-sm font-bold text-gray-600 hover:text-black"
          >
            ← Yöneticilere Dön
          </Link>

          <p className="mt-6 text-xs font-bold tracking-[0.25em] text-[#b8860b]">
            OZT DIGITAL MENU
          </p>

          <p className="mt-2 text-sm font-semibold text-gray-500">
            Sistem Sahibi
          </p>

          <h1 className="mt-1 text-3xl font-black text-[#111]">
            Yönetici Detayı
          </h1>

        </div>

        {/* YÖNETİCİ KARTI */}

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">

          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">

            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-[#f7f0dc] text-3xl">
              👤
            </div>

            <div>

              <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Yönetici Hesabı
              </p>

              <h2 className="mt-1 text-2xl font-black">
                Restoran Yöneticisi
              </h2>

              <p className="mt-2 break-all text-xs text-gray-400">
                User ID: {manager.user_id}
              </p>

            </div>

          </div>

        </section>

        {/* RESTORAN */}

        <section className="mt-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">

          <p className="text-xs font-bold uppercase tracking-wider text-[#b8860b]">
            BAĞLI RESTORAN
          </p>

          <h2 className="mt-2 text-2xl font-black">
            {restaurant?.name ??
              "Restoran bulunamadı"}
          </h2>

          {restaurant?.description && (
            <p className="mt-2 text-sm leading-6 text-gray-500">
              {restaurant.description}
            </p>
          )}

          <div className="mt-6 grid gap-4 sm:grid-cols-2">

            <div className="rounded-xl bg-[#f8f7f4] p-4">

              <p className="text-xs font-semibold text-gray-400">
                Restoran ID
              </p>

              <p className="mt-1 font-bold">
                {restaurant?.id ?? "-"}
              </p>

            </div>

            <div className="rounded-xl bg-[#f8f7f4] p-4">

              <p className="text-xs font-semibold text-gray-400">
                Slug
              </p>

              <p className="mt-1 font-bold">
                {restaurant?.slug ?? "-"}
              </p>

            </div>

          </div>

        </section>

        {/* YETKİ */}

        <section className="mt-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">

          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
            YETKİ BİLGİSİ
          </p>

          <div className="mt-4 flex items-center justify-between rounded-xl bg-green-50 p-4">

            <div>

              <p className="text-sm font-bold text-gray-800">
                Hesap Rolü
              </p>

              <p className="mt-1 text-xs text-gray-500">
                Bu kullanıcının restoran üzerindeki rolü.
              </p>

            </div>

            <span className="rounded-full bg-green-100 px-4 py-2 text-xs font-black text-green-700">
              {manager.role ?? "manager"}
            </span>

          </div>

        </section>

        {/* TARİH */}

        <section className="mt-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">

          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
            KAYIT BİLGİSİ
          </p>

          <div className="mt-4">

            <p className="text-sm text-gray-500">
              Restorana bağlanma tarihi
            </p>

            <p className="mt-1 font-bold">
              {new Intl.DateTimeFormat(
                "tr-TR",
                {
                  dateStyle: "long",
                  timeStyle: "short",
                }
              ).format(
                new Date(manager.created_at)
              )}
            </p>

          </div>

        </section>

        {/* BUTONLAR */}

        <div className="mt-6 flex flex-wrap gap-3">

          {restaurant?.slug && (
            <Link
              href={`/restoran/${restaurant.slug}`}
              target="_blank"
              className="rounded-xl bg-[#111] px-5 py-3 text-sm font-bold text-white hover:bg-black"
            >
              ↗ Restoranı Gör
            </Link>
          )}

          <Link
            href="/sistem/yoneticiler"
            className="rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-bold text-gray-800 hover:bg-gray-50"
          >
            ← Yönetici Listesi
          </Link>

        </div>

        <footer className="mt-10 border-t border-gray-200 pt-5 text-xs text-gray-400">
          OZT DIGITAL MENU · Sistem Sahibi Paneli
        </footer>

      </div>
    </main>
  );
}