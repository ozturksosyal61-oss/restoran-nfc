import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },

        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          supabaseResponse = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });

          Object.entries(headers).forEach(([key, value]) => {
            supabaseResponse.headers.set(key, value);
          });
        },
      },
    }
  );

  // --------------------------------------------------
  // SUPABASE OTURUM KONTROLÜ
  // --------------------------------------------------

  const { data: claimsData } =
    await supabase.auth.getClaims();

  const claims = claimsData?.claims;

  const pathname = request.nextUrl.pathname;

  // --------------------------------------------------
  // ADMIN PANELİ KORUMASI
  // --------------------------------------------------

  if (
    pathname.startsWith("/admin") &&
    !pathname.startsWith("/admin/login") &&
    !claims
  ) {
    const url = request.nextUrl.clone();

    url.pathname = "/admin/login";

    return NextResponse.redirect(url);
  }

  // --------------------------------------------------
  // SİSTEM SAHİBİ PANELİ KORUMASI
  // --------------------------------------------------

  if (
    pathname.startsWith("/sistem") &&
    !pathname.startsWith("/sistem/login")
  ) {
    // Kullanıcı giriş yapmamışsa
    if (!claims) {
      const url = request.nextUrl.clone();

      url.pathname = "/sistem/login";

      return NextResponse.redirect(url);
    }

    // JWT içerisindeki kullanıcı ID'si
    const userId = claims.sub;

    // Kullanıcının system_admins tablosunda
    // sistem sahibi olarak kayıtlı olup olmadığını kontrol et
    const { data: systemAdmin, error } = await supabase
      .from("system_admins")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();

    // Sistem sahibi değilse erişimi engelle
    if (error || !systemAdmin) {
      const url = request.nextUrl.clone();

      url.pathname = "/sistem/login";
      url.searchParams.set("error", "unauthorized");

      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}