import { notFound, redirect } from "next/navigation";

import { supabase } from "../../../../lib/supabase";

import MenuLayouts from "./MenuLayouts";
import Cart from "./Cart";

type Category = {
  id: number;
  name: string;
  sort_order: number;
};

type Product = {
  id: number;
  category_id: number;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  ingredients: string | null;
  allergens: string | null;
  is_available: boolean;
  sort_order: number;
};

type Restaurant = {
  id: number;
  name: string;
  slug: string;

  description: string | null;

  phone: string | null;
  address: string | null;

  logo_url: string | null;
  cover_image_url: string | null;

  instagram_url: string | null;
  google_review_url: string | null;

  is_open: boolean | null;

  opening_time: string | null;
  closing_time: string | null;
  theme: string | null;
};

export const dynamic =
  "force-dynamic";

/*
 * =====================================================
 * GARSON ÇAĞIR — SERVER ACTION
 * =====================================================
 */

async function callWaiter(
  formData: FormData
) {
  "use server";

  const slug = String(
    formData.get("slug") || ""
  ).trim();

  const masa = String(
    formData.get("masa") || ""
  ).trim();

  if (!slug || !masa) {
    return;
  }

  const {
    data: restaurant,
  } = await supabase
    .from("restaurants")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (!restaurant) {
    redirect(
      `/restoran/${slug}/menu?masa=${encodeURIComponent(masa)}&garson=hata`
    );
  }

  const {
    data: table,
  } = await supabase
    .from("restaurant_tables")
    .select("id")
    .eq("restaurant_id", restaurant.id)
    .eq("public_token", masa)
    .eq("is_active", true)
    .maybeSingle();

  if (!table) {
    redirect(
      `/restoran/${slug}/menu?masa=${encodeURIComponent(masa)}&garson=hata`
    );
  }

  /* Aynı masa için bekleyen çağrıyı tekrar oluşturma. */
  const {
    data: existingRequest,
  } = await supabase
    .from("service_requests")
    .select("id")
    .eq("restaurant_id", restaurant.id)
    .eq("table_id", table.id)
    .eq("request_type", "garson")
    .eq("status", "pending")
    .maybeSingle();

  if (!existingRequest) {
    const { error } = await supabase
      .from("service_requests")
      .insert({
        restaurant_id: restaurant.id,
        table_id: table.id,
        request_type: "garson",
        status: "pending",
      });

    if (error) {
      console.error(
        "Garson çağırma hatası:",
        error
      );

      redirect(
        `/restoran/${slug}/menu?masa=${encodeURIComponent(masa)}&garson=hata`
      );
    }
  }

  redirect(
    `/restoran/${slug}/menu?masa=${encodeURIComponent(masa)}&garson=ok`
  );
}

export default async function RestaurantMenuPage({
  params,
  searchParams,
}: {
  params: Promise<{
    slug: string;
  }>;

  searchParams: Promise<{
    masa?: string;
    garson?: string;
    layout?: string;
  }>;
}) {
  const { slug } =
    await params;

  const { masa, garson, layout: requestedLayout } =
    await searchParams;

  /*
   * =====================================================
   * MENÜ TASARIMI
   * =====================================================
   *
   * Eski menu_layout değerleri korunur.
   * Sistem sahibi tarafından seçilen restaurants.theme
   * ozt-glass-premium ise yeni uygulama tipi tema önceliklidir.
   */
  type MenuLayout =
    | "classic"
    | "editorial"
    | "grid"
    | "ivory"
    | "ozt-glass-premium";

  const requestedLegacyLayout: MenuLayout =
    requestedLayout === "classic"
      ? "classic"
      : requestedLayout === "editorial"
      ? "editorial"
      : requestedLayout === "grid"
      ? "grid"
      : requestedLayout === "ivory"
      ? "ivory"
      : requestedLayout === "ozt-glass-premium"
      ? "ozt-glass-premium"
      : requestedLayout === "luxury"
      ? "ivory"
      : requestedLayout === "minimal"
      ? "grid"
      : "grid";

  /*
   * =====================================================
   * RESTORAN
   * =====================================================
   */

  const {
    data: restaurant,
    error: restaurantError,
  } = await supabase
    .from("restaurants")
    .select(`
      id,
      name,
      slug,
      description,
      phone,
      address,
      logo_url,
      cover_image_url,
      instagram_url,
      google_review_url,
      is_open,
      opening_time,
      closing_time,
      theme
    `)
    .eq(
      "slug",
      slug
    )
    .single();

  if (
    restaurantError ||
    !restaurant
  ) {
    notFound();
  }

  const restaurantData =
    restaurant as Restaurant;

  const menuLayout: MenuLayout =
    restaurantData.theme === "ozt-glass-premium"
      ? "ozt-glass-premium"
      : requestedLegacyLayout;

  /*
   * =====================================================
   * KATEGORİLER
   * =====================================================
   */

  const {
    data: categoriesData,
    error: categoriesError,
  } = await supabase
    .from("categories")
    .select(
      "id, name, sort_order"
    )
    .eq(
      "restaurant_id",
      restaurantData.id
    )
    .order(
      "sort_order",
      {
        ascending: true,
      }
    );

  if (categoriesError) {
    console.error(
      "Kategoriler yüklenemedi:",
      categoriesError
    );
  }

  const categories: Category[] =
    categoriesData || [];

  /*
   * =====================================================
   * ÜRÜNLER
   * =====================================================
   */

  const categoryIds =
    categories.map(
      (category) =>
        category.id
    );

  let products: Product[] =
    [];

  if (
    categoryIds.length > 0
  ) {
    const {
      data: productsData,
      error: productsError,
    } = await supabase
      .from("products")
      .select(`
        id,
        category_id,
        name,
        description,
        price,
        image_url,
        ingredients,
        allergens,
        is_available,
        sort_order
      `)
      .in(
        "category_id",
        categoryIds
      )
      .eq(
        "is_available",
        true
      )
      .order(
        "sort_order",
        {
          ascending: true,
        }
      );

    if (productsError) {
      console.error(
        "Ürünler yüklenemedi:",
        productsError
      );
    }

    products =
      productsData || [];
  }

  /*
   * =====================================================
   * QR / NFC MASA
   * =====================================================
   */

  let tableNumber:
    number | null = null;

  let tableToken:
    string | null = null;

  if (
    masa?.trim()
  ) {
    tableToken =
      masa.trim();

    const {
      data: tableData,
      error: tableError,
    } = await supabase
      .from(
        "restaurant_tables"
      )
      .select(
        "id, table_number, public_token, is_active"
      )
      .eq(
        "restaurant_id",
        restaurantData.id
      )
      .eq(
        "public_token",
        tableToken
      )
      .eq(
        "is_active",
        true
      )
      .maybeSingle();

    if (tableError) {
      console.error(
        "QR/NFC masa doğrulama hatası:",
        tableError
      );
    }

    if (tableData) {
      tableNumber =
        Number(
          tableData.table_number
        );
    }
  }

  /*
   * =====================================================
   * AÇIK / KAPALI
   * =====================================================
   */

  const isOpen =
    restaurantData.is_open !==
    false;

  /*
   * =====================================================
   * ÇALIŞMA SAATİ
   * =====================================================
   */

  const openingTime =
    restaurantData.opening_time
      ? String(
          restaurantData.opening_time
        ).slice(0, 5)
      : "";

  const closingTime =
    restaurantData.closing_time
      ? String(
          restaurantData.closing_time
        ).slice(0, 5)
      : "";

  /*
   * =====================================================
   * OZT APP PREMIUM — AYRI EKRAN
   * =====================================================
   * Premium tema aktifken eski restoran hero/bilgi/garson
   * kabuğunu tekrar render etmiyoruz. Böylece iki tasarım
   * birbirinin içine girmez.
   */

  if (menuLayout === "ozt-glass-premium") {
    return (
      <main
        className="ozt-premium-page"
        style={{
          minHeight: "100vh",
          width: "100%",
          margin: 0,
          padding: 0,
          background:
            "radial-gradient(circle at 50% -10%, rgba(241,203,130,.08), transparent 28%), linear-gradient(180deg, #07090b 0%, #0b0d10 55%, #090a0c 100%)",
          color: "#f7f2e9",
          overflowX: "hidden",
        }}
      >
        <section
          style={{
            width: "100%",
            maxWidth: "980px",
            minHeight: "100vh",
            margin: "0 auto",
          }}
        >
          <MenuLayouts
            categories={categories}
            products={products}
            layout="ozt-glass-premium"
            restaurantName={restaurantData.name}
            tableNumber={tableNumber}
            slug={slug}
            masa={masa || ""}
            garson={garson || ""}
            waiterAction={callWaiter}
          />
        </section>
      </main>
    );
  }

  /*
   * =====================================================
   * EKRAN
   * =====================================================
   */

  return (
      <main
        style={{
          minHeight:
            "100vh",
          background:
            "#f5f3ef",
          color:
            "#171717",
          paddingBottom:
            "100px",
        }}
      >
        {/* =================================================
            HEADER
        ================================================= */}

        <header
          style={{
            position:
              "sticky",
            top: 0,
            zIndex: 50,
            background:
              "rgba(245,243,239,.94)",
            backdropFilter:
              "blur(14px)",
            borderBottom:
              "1px solid #e8e4dc",
          }}
        >
          <div
            style={{
              width:
                "100%",
              maxWidth:
                "760px",
              margin:
                "0 auto",
              padding:
                "13px 18px",
              display:
                "flex",
              alignItems:
                "center",
              justifyContent:
                "space-between",
              gap:
                "12px",
            }}
          >
            <div
              style={{
                display:
                  "flex",
                alignItems:
                  "center",
                gap:
                  "12px",
                minWidth:
                  0,
              }}
            >
              {restaurantData.logo_url ? (
                <img
                  src={
                    restaurantData.logo_url
                  }
                  alt={`${restaurantData.name} logosu`}
                  style={{
                    width:
                      "46px",
                    height:
                      "46px",
                    borderRadius:
                      "14px",
                    objectFit:
                      "contain",
                    background:
                      "#fff",
                    border:
                      "1px solid #e7e2d8",
                    flexShrink:
                      0,
                  }}
                />
              ) : (
                <div
                  style={{
                    width:
                      "46px",
                    height:
                      "46px",
                    borderRadius:
                      "14px",
                    background:
                      "#111",
                    color:
                      "#d4a017",
                    display:
                      "flex",
                    alignItems:
                      "center",
                    justifyContent:
                      "center",
                    fontSize:
                      "13px",
                    fontWeight:
                      950,
                    flexShrink:
                      0,
                  }}
                >
                  {restaurantData.name
                    .slice(
                      0,
                      3
                    )
                    .toUpperCase()}
                </div>
              )}

              <div
                style={{
                  minWidth:
                    0,
                }}
              >
                <div
                  style={{
                    fontSize:
                      "17px",
                    fontWeight:
                      900,
                    whiteSpace:
                      "nowrap",
                    overflow:
                      "hidden",
                    textOverflow:
                      "ellipsis",
                  }}
                >
                  {
                    restaurantData.name
                  }
                </div>

                <div
                  style={{
                    fontSize:
                      "11px",
                    color:
                      "#888",
                    marginTop:
                      "2px",
                  }}
                >
                  Dijital Menü
                </div>
              </div>
            </div>

            {tableNumber && (
              <div
                style={{
                  flexShrink:
                    0,
                  padding:
                    "9px 13px",
                  borderRadius:
                    "12px",
                  background:
                    "#111",
                  color:
                    "#fff",
                  fontSize:
                    "12px",
                  fontWeight:
                    800,
                }}
              >
                🪑 Masa{" "}
                {tableNumber}
              </div>
            )}
          </div>
        </header>

        {/* =================================================
            KAPALI UYARISI
        ================================================= */}

        {!isOpen && (
          <section
            style={{
              width:
                "100%",
              maxWidth:
                "760px",
              margin:
                "0 auto",
              padding:
                "14px 18px 0",
            }}
          >
            <div
              style={{
                background:
                  "#fff1f1",
                border:
                  "1px solid #efc1c1",
                borderRadius:
                  "16px",
                padding:
                  "15px 17px",
                display:
                  "flex",
                gap:
                  "12px",
                alignItems:
                  "flex-start",
              }}
            >
              <div
                style={{
                  fontSize:
                    "22px",
                }}
              >
                🔴
              </div>

              <div>
                <strong
                  style={{
                    display:
                      "block",
                    color:
                      "#a51d1d",
                    fontSize:
                      "14px",
                  }}
                >
                  Şu anda kapalıyız
                </strong>

                <p
                  style={{
                    margin:
                      "4px 0 0",
                    color:
                      "#7d5555",
                    fontSize:
                      "12px",
                    lineHeight:
                      1.5,
                  }}
                >
                  Menümüzü
                  inceleyebilirsiniz.
                  Yeni siparişler
                  işletme açıldığında
                  alınacaktır.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* =================================================
            HERO
        ================================================= */}

        <section
          style={{
            width:
              "100%",
            maxWidth:
              "760px",
            margin:
              "0 auto",
            padding:
              "28px 18px 18px",
          }}
        >
          <div
            style={{
              minHeight:
                restaurantData.cover_image_url
                  ? "280px"
                  : "230px",
              borderRadius:
                "26px",
              position:
                "relative",
              overflow:
                "hidden",
              boxShadow:
                "0 18px 45px rgba(0,0,0,.13)",
              background:
                restaurantData.cover_image_url
                  ? `linear-gradient(180deg,rgba(0,0,0,.16),rgba(0,0,0,.78)),url("${restaurantData.cover_image_url}") center/cover`
                  : "linear-gradient(135deg,#171717,#29251b)",
              color:
                "#fff",
            }}
          >
            <div
              style={{
                position:
                  "absolute",
                width:
                  "200px",
                height:
                  "200px",
                border:
                  "1px solid rgba(212,160,23,.28)",
                borderRadius:
                  "50%",
                right:
                  "-80px",
                top:
                  "-90px",
              }}
            />

            <div
              style={{
                position:
                  "relative",
                zIndex:
                  1,
                minHeight:
                  "230px",
                padding:
                  "28px 24px",
                display:
                  "flex",
                flexDirection:
                  "column",
                justifyContent:
                  "flex-end",
              }}
            >
              <div
                style={{
                  display:
                    "flex",
                  alignItems:
                    "center",
                  gap:
                    "14px",
                  marginBottom:
                    "14px",
                }}
              >
                {restaurantData.logo_url && (
                  <img
                    src={
                      restaurantData.logo_url
                    }
                    alt=""
                    style={{
                      width:
                        "58px",
                      height:
                        "58px",
                      borderRadius:
                        "17px",
                      objectFit:
                        "contain",
                      background:
                        "rgba(255,255,255,.96)",
                      padding:
                        "4px",
                    }}
                  />
                )}

                <div
                  style={{
                    fontSize:
                      "10px",
                    fontWeight:
                      900,
                    letterSpacing:
                      "2.4px",
                    color:
                      "#d4a017",
                  }}
                >
                  HOŞ GELDİNİZ
                </div>
              </div>

              <h1
                style={{
                  margin:
                    0,
                  fontSize:
                    "clamp(28px,7vw,42px)",
                  lineHeight:
                    1.05,
                  fontWeight:
                    950,
                }}
              >
                {
                  restaurantData.name
                }
              </h1>

              {restaurantData.description && (
                <p
                  style={{
                    margin:
                      "12px 0 0",
                    maxWidth:
                      "570px",
                    color:
                      "rgba(255,255,255,.75)",
                    fontSize:
                      "13px",
                    lineHeight:
                      1.6,
                  }}
                >
                  {
                    restaurantData.description
                  }
                </p>
              )}

              <div
                style={{
                  display:
                    "flex",
                  flexWrap:
                    "wrap",
                  gap:
                    "8px",
                  marginTop:
                    "17px",
                }}
              >
                <span
                  style={{
                    padding:
                      "8px 12px",
                    borderRadius:
                      "999px",
                    background:
                      "rgba(255,255,255,.10)",
                    border:
                      "1px solid rgba(255,255,255,.13)",
                    fontSize:
                      "11px",
                    fontWeight:
                      800,
                  }}
                >
                  📋 {categories.length} kategori
                </span>

                <span
                  style={{
                    padding:
                      "8px 12px",
                    borderRadius:
                      "999px",
                    background:
                      "rgba(255,255,255,.10)",
                    border:
                      "1px solid rgba(255,255,255,.13)",
                    fontSize:
                      "11px",
                    fontWeight:
                      800,
                  }}
                >
                  🍽️ {products.length} ürün
                </span>

                <span
                  style={{
                    padding:
                      "8px 12px",
                    borderRadius:
                      "999px",
                    background:
                      isOpen
                        ? "rgba(41,185,94,.18)"
                        : "rgba(255,80,80,.18)",
                    border:
                      "1px solid rgba(255,255,255,.13)",
                    fontSize:
                      "11px",
                    fontWeight:
                      800,
                  }}
                >
                  {isOpen
                    ? "🟢 Açığız"
                    : "🔴 Kapalıyız"}
                </span>

                {tableNumber && (
                  <span
                    style={{
                      padding:
                        "8px 12px",
                      borderRadius:
                        "999px",
                      background:
                        "rgba(255,255,255,.10)",
                      border:
                        "1px solid rgba(255,255,255,.13)",
                      fontSize:
                        "11px",
                      fontWeight:
                        800,
                    }}
                  >
                    🪑 Masa{" "}
                    {tableNumber}
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* =================================================
            İŞLETME BİLGİLERİ
        ================================================= */}

        {(restaurantData.phone ||
          restaurantData.address ||
          restaurantData.instagram_url ||
          restaurantData.google_review_url ||
          openingTime ||
          closingTime) && (
          <section
            style={{
              width:
                "100%",
              maxWidth:
                "760px",
              margin:
                "0 auto",
              padding:
                "0 18px 18px",
            }}
          >
            <div
              style={{
                background:
                  "#fff",
                border:
                  "1px solid #e5e0d8",
                borderRadius:
                  "18px",
                padding:
                  "16px",
                display:
                  "flex",
                flexWrap:
                  "wrap",
                gap:
                  "8px",
              }}
            >
              {restaurantData.phone && (
                <a
                  href={`tel:${restaurantData.phone}`}
                  style={
                    infoButtonStyle
                  }
                >
                  📞 Ara
                </a>
              )}

              {restaurantData.instagram_url && (
                <a
                  href={
                    restaurantData.instagram_url
                  }
                  target="_blank"
                  rel="noreferrer"
                  style={
                    infoButtonStyle
                  }
                >
                  📸 Instagram
                </a>
              )}

              {restaurantData.google_review_url && (
                <a
                  href={
                    restaurantData.google_review_url
                  }
                  target="_blank"
                  rel="noreferrer"
                  style={
                    infoButtonStyle
}
                >
                  ⭐ Yorum Yap
                </a>
              )}

              {(openingTime ||
                closingTime) && (
                <div
                  style={{
                    width:
                      "100%",
                    marginTop:
                      "3px",
                    padding:
                      "10px 12px",
                    borderRadius:
                      "10px",
                    background:
                      "#faf8f4",
                    color:
                      "#777",
                    fontSize:
                      "11px",
                    fontWeight:
                      700,
                  }}
                >
                  🕐 Çalışma Saatleri:{" "}
                  {openingTime ||
                    "--:--"}{" "}
                  -{" "}
                  {closingTime ||
                    "--:--"}
                </div>
              )}
            </div>
          </section>
        )}

        {/* =================================================
            GARSON ÇAĞIR
        ================================================= */}

        {tableNumber && (
          <section
            style={{
              width:
                "100%",
              maxWidth:
                "760px",
              margin:
                "0 auto",
              padding:
                "0 18px 18px",
            }}
          >
            {garson === "ok" && (
              <div
                style={{
                  marginBottom:
                    "10px",
                  padding:
                    "12px 14px",
                  borderRadius:
                    "12px",
                  background:
                    "#edf9f0",
                  border:
                    "1px solid #b9e3c2",
                  color:
                    "#17652a",
                  fontSize:
                    "12px",
                  fontWeight:
                    800,
                  textAlign:
                    "center",
                }}
              >
                ✅ Garson çağrınız gönderildi.
              </div>
            )}

            {garson === "hata" && (
              <div
                style={{
                  marginBottom:
                    "10px",
                  padding:
                    "12px 14px",
                  borderRadius:
                    "12px",
                  background:
                    "#fff1f1",
                  border:
                    "1px solid #efc1c1",
                  color:
                    "#9d2424",
                  fontSize:
                    "12px",
                  fontWeight:
                    800,
                  textAlign:
                    "center",
                }}
              >
                Garson çağrısı gönderilemedi. Lütfen tekrar deneyin.
              </div>
            )}

            <form
              action={callWaiter}
            >
              <input
                type="hidden"
                name="slug"
                value={slug}
              />
              <input
                type="hidden"
                name="masa"
                value={masa || ""}
              />

              <button
                type="submit"
                style={{
                  width:
                    "100%",
                  minHeight:
                    "50px",
                  border:
                    "none",
                  borderRadius:
                    "14px",
                  background:
                    "linear-gradient(135deg,#171717,#29251b)",
                  color:
                    "#d4a017",
                  fontSize:
                    "13px",
                  fontWeight:
                    900,
                  letterSpacing:
                    ".2px",
                  cursor:
                    "pointer",
                  boxShadow:
                    "0 8px 20px rgba(0,0,0,.12)",
                }}
              >
                🔔 Garson Çağır
              </button>

              <p
                style={{
                  margin:
                    "7px 0 0",
                  textAlign:
                    "center",
                  color:
                    "#999",
                  fontSize:
                    "10px",
                }}
              >
                Masa {tableNumber} için garson çağırabilirsiniz.
              </p>
            </form>
          </section>
        )}

        {/* =================================================
            KATEGORİ NAVİGASYONU
        ================================================= */}

        {categories.length >
          0 && (
          <nav
            aria-label="Menü kategorileri"
            style={{
              width:
                "100%",
              maxWidth:
                "760px",
              margin:
                "0 auto",
              padding:
                "4px 18px 18px",
              display:
                "flex",
              gap:
                "8px",
              overflowX:
                "auto",
              scrollbarWidth:
                "none",
            }}
          >
            {categories.map(
              (category) => (
                <a
                  key={
                    category.id
                  }
                  href={`#category-${category.id}`}
                  style={{
                    flexShrink:
                      0,
                    padding:
                      "10px 15px",
                    borderRadius:
                      "999px",
                    background:
                      "#fff",
                    border:
                      "1px solid #e5e1d9",
                    color:
                      "#333",
                    textDecoration:
                      "none",
                    fontSize:
                      "12px",
                    fontWeight:
                      800,
                  }}
                >
                  {
                    category.name
                  }
                </a>
              )
            )}
          </nav>
        )}

        {/* =================================================
            MENÜ
        ================================================= */}

        <section
          style={{
            width:
              "100%",
            maxWidth:
              "760px",
            margin:
              "0 auto",
            padding:
              "0 18px",
          }}
        >
          <MenuLayouts
            categories={categories}
            products={products}
            layout={menuLayout}
          />

          {/* BOŞ MENÜ */}

          {categories.length ===
            0 && (
            <div
              style={{
                background:
                  "#fff",
                border:
                  "1px solid #e7e2da",
                borderRadius:
                  "22px",
                padding:
                  "40px 24px",
                textAlign:
                  "center",
              }}
            >
              <div
                style={{
                  fontSize:
                    "42px",
                  marginBottom:
                    "12px",
                }}
              >
                🍽️
              </div>

              <h2
                style={{
                  margin:
                    0,
                  fontSize:
                    "20px",
                  fontWeight:
                    900,
                }}
              >
                Menü hazırlanıyor
              </h2>

              <p
                style={{
                  margin:
                    "8px 0 0",
                  color:
                    "#888",
                  fontSize:
                    "13px",
                }}
              >
                Menüde henüz
                ürün bulunmuyor.
              </p>
            </div>
          )}
        </section>

        {/* =================================================
            SEPET
        ================================================= */}

        {isOpen ? (
          <div id="cart">
            <Cart />
          </div>
        ) : (
          <section
            style={{
              width:
                "100%",
              maxWidth:
                "760px",
              margin:
                "0 auto",
              padding:
                "0 18px",
            }}
          >
            <div
              style={{
                marginTop:
                  "8px",
                background:
                  "#171717",
                color:
                  "#fff",
                borderRadius:
                  "18px",
                padding:
                  "18px",
                textAlign:
                  "center",
                fontSize:
                  "13px",
                fontWeight:
                  800,
              }}
            >
              🔴 Restoran şu anda
              kapalı. Yeni sipariş
              alınmıyor.
            </div>
          </section>
        )}

        {/* =================================================
            FOOTER
        ================================================= */}

        <footer
          style={{
            width:
              "100%",
            maxWidth:
              "760px",
            margin:
              "40px auto 0",
            padding:
              "25px 18px",
            textAlign:
              "center",
            color:
              "#aaa",
            fontSize:
              "10px",
          }}
        >
          <strong
            style={{
              display:
                "block",
              color:
                "#777",
              letterSpacing:
                "2px",
              marginBottom:
                "5px",
            }}
          >
            OZT DIGITAL MENU
          </strong>

          Dijital restoran
          menü sistemi
        </footer>
      </main>
  );
}

/*
 * =========================================================
 * BUTTON
 * =========================================================
 */

const infoButtonStyle:
  React.CSSProperties = {
    display:
      "inline-flex",
    alignItems:
      "center",
    justifyContent:
      "center",
    padding:
      "10px 13px",
    borderRadius:
      "10px",
    background:
      "#faf8f4",
    border:
      "1px solid #e5e0d8",
    color:
      "#333",
    textDecoration:
      "none",
    fontSize:
      "11px",
    fontWeight:
      800,
  };