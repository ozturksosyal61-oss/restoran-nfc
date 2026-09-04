import { notFound, redirect } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import SiparisTakipLink from "./SiparisTakipLink";

async function callWaiter(formData: FormData) {
  "use server";

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
      `/restoran/${slug}?masa=${encodeURIComponent(masa)}&garson=hata`
    );
  }

  const { data: table } = await supabase
    .from("restaurant_tables")
    .select("id, table_number")
    .eq("restaurant_id", restaurant.id)
    .eq("public_token", masa)
    .eq("is_active", true)
    .maybeSingle();

  if (!table) {
    redirect(
      `/restoran/${slug}?masa=${encodeURIComponent(masa)}&garson=hata`
    );
  }

  // Aynı masa için bekleyen çağrıyı tekrar oluşturma.
  const { data: existingRequest } = await supabase
    .from("service_requests")
    .select("id")
    .eq("restaurant_id", restaurant.id)
    .eq("table_id", table.id)
    .eq("request_type", "garson")
    .eq("status", "pending")
    .maybeSingle();

  if (!existingRequest) {
    const { error: insertError } = await supabase
      .from("service_requests")
      .insert({
        restaurant_id: restaurant.id,
        table_id: table.id,
        request_type: "garson",
        status: "pending",
      });

    if (insertError) {
      console.error("Ana sayfa garson çağrısı hatası:", insertError);

      redirect(
        `/restoran/${slug}?masa=${encodeURIComponent(masa)}&garson=hata`
      );
    }
  }

  redirect(
    `/restoran/${slug}?masa=${encodeURIComponent(masa)}&garson=ok`
  );
}

async function requestBill(formData: FormData) {
  "use server";

  const slug = String(formData.get("slug") || "").trim();
  const masa = String(formData.get("masa") || "").trim();

  if (!slug || !masa) {
    return;
  }

  const { data: restaurant, error: restaurantError } = await supabase
    .from("restaurants")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (restaurantError || !restaurant) {
    console.error(
      "Hesap isteği restoran doğrulama hatası:",
      restaurantError
    );

    redirect(
      `/restoran/${slug}?masa=${encodeURIComponent(masa)}&hesap=hata`
    );
  }

  const { data: table, error: tableError } = await supabase
    .from("restaurant_tables")
    .select("id")
    .eq("restaurant_id", restaurant.id)
    .eq("public_token", masa)
    .eq("is_active", true)
    .maybeSingle();

  if (tableError || !table) {
    console.error(
      "Hesap isteği masa doğrulama hatası:",
      tableError
    );

    redirect(
      `/restoran/${slug}?masa=${encodeURIComponent(masa)}&hesap=hata`
    );
  }

  const { data: requestId, error: requestError } = await supabase.rpc(
    "create_public_service_request",
    {
      p_restaurant_id: restaurant.id,
      p_table_id: table.id,
      p_request_type: "hesap",
    }
  );

  if (requestError || !requestId) {
    console.error(
      "Ana sayfa hesap talebi RPC hatası:",
      requestError
    );

    redirect(
      `/restoran/${slug}?masa=${encodeURIComponent(masa)}&hesap=hata`
    );
  }

  redirect(
    `/restoran/${slug}?masa=${encodeURIComponent(masa)}&hesap=ok`
  );
}

export default async function RestaurantPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    masa?: string | string[];
    garson?: string | string[];
    hesap?: string | string[];
  }>;
}) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  const rawTableToken = resolvedSearchParams.masa;
  const tableToken = Array.isArray(rawTableToken)
    ? rawTableToken[0]
    : rawTableToken;

  const rawGarsonStatus = resolvedSearchParams.garson;
  const garsonStatus = Array.isArray(rawGarsonStatus)
    ? rawGarsonStatus[0]
    : rawGarsonStatus;

  const rawHesapStatus = resolvedSearchParams.hesap;
  const hesapStatus = Array.isArray(rawHesapStatus)
    ? rawHesapStatus[0]
    : rawHesapStatus;

  // --------------------------------------------------
  // RESTORANI GETİR
  // --------------------------------------------------

  const { data: restaurant, error } = await supabase
    .from("restaurants")
    .select(
      "id, name, slug, description, instagram_url, google_review_url, logo_url, theme"
    )
    .eq("slug", slug)
    .single();

  if (error || !restaurant) {
    notFound();
  }

  // --------------------------------------------------
  // QR / NFC MASA BİLGİSİNİ GETİR
  // --------------------------------------------------

  let table: {
    id: number;
    table_number: number;
    public_token: string;
  } | null = null;

  if (tableToken) {
    const { data: tableData } = await supabase
      .from("restaurant_tables")
      .select("id, table_number, public_token")
      .eq("restaurant_id", restaurant.id)
      .eq("public_token", tableToken)
      .eq("is_active", true)
      .maybeSingle();

    table = tableData;
  }

  // QR ve NFC ile gelen masa bilgisi varsa, alt sayfalara da taşı.
  const tableQuery = table?.public_token
    ? `?masa=${encodeURIComponent(table.public_token)}`
    : "";

  // --------------------------------------------------
  // YAYINDAKİ DEĞERLENDİRMELERİ GETİR
  // --------------------------------------------------

  const { data: reviews } = await supabase
    .from("reviews")
    .select(
      "id, customer_name, rating, comment, created_at"
    )
    .eq("restaurant_id", restaurant.id)
    .eq("is_visible", true)
    .order("created_at", {
      ascending: false,
    });

  // --------------------------------------------------
  // ORTALAMA PUAN
  // --------------------------------------------------

  const totalReviews = reviews?.length ?? 0;

  const averageRating =
    totalReviews > 0
      ? (
          reviews!.reduce(
            (total, review) =>
              total + Number(review.rating),
            0
          ) / totalReviews
        ).toFixed(1)
      : "0.0";

  // --------------------------------------------------
  // PUAN DAĞILIMI
  // --------------------------------------------------

  const ratingCounts = {
    5:
      reviews?.filter(
        (review) => Number(review.rating) === 5
      ).length ?? 0,

    4:
      reviews?.filter(
        (review) => Number(review.rating) === 4
      ).length ?? 0,

    3:
      reviews?.filter(
        (review) => Number(review.rating) === 3
      ).length ?? 0,

    2:
      reviews?.filter(
        (review) => Number(review.rating) === 2
      ).length ?? 0,

    1:
      reviews?.filter(
        (review) => Number(review.rating) === 1
      ).length ?? 0,
  };

  const isGlassPremium = restaurant.theme === "ozt-glass-premium";

  return (
    <>
      <style>{`
        .ozt-modern-home {
          --ozt-bg: #f6f2ea;
          --ozt-surface: rgba(255,255,255,.78);
          --ozt-surface-solid: #fffdf9;
          --ozt-text: #241f18;
          --ozt-muted: #766b5c;
          --ozt-gold: #b58b45;
          --ozt-gold-dark: #8b6428;
          --ozt-line: rgba(120,94,54,.16);
          min-height: 100vh;
          padding: 18px 14px 42px;
          background:
            radial-gradient(circle at 0% 0%, rgba(255,255,255,.98) 0 18%, transparent 42%),
            radial-gradient(circle at 100% 0%, rgba(208,180,128,.22), transparent 32%),
            linear-gradient(180deg, #f7f4ee 0%, #eee7dc 100%);
          color: var(--ozt-text);
          box-sizing: border-box;
        }

        .ozt-modern-shell {
          width: 100%;
          max-width: 560px;
          margin: 0 auto;
        }

        .ozt-modern-hero {
          position: relative;
          overflow: hidden;
          padding: 24px 18px 20px;
          border: 1px solid rgba(153,121,72,.18);
          border-radius: 30px;
          background:
            linear-gradient(145deg, rgba(255,255,255,.9), rgba(242,235,225,.74)),
            radial-gradient(circle at 80% 20%, rgba(185,141,69,.10), transparent 32%);
          box-shadow:
            0 20px 45px rgba(71,55,34,.10),
            inset 0 1px 0 rgba(255,255,255,.95);
          backdrop-filter: blur(18px);
        }

        .ozt-modern-hero::before,
        .ozt-modern-hero::after {
          content: "";
          position: absolute;
          border-radius: 999px;
          border: 1px solid rgba(181,139,69,.20);
          pointer-events: none;
        }
        .ozt-modern-hero::before {
          width: 170px; height: 170px; left: -92px; top: -110px;
          box-shadow: 0 0 0 20px rgba(181,139,69,.04), 0 0 0 40px rgba(255,255,255,.45);
        }
        .ozt-modern-hero::after {
          width: 140px; height: 140px; right: -72px; top: -92px;
          box-shadow: 0 0 0 18px rgba(181,139,69,.04);
        }

        .ozt-modern-logo-wrap {
          display: flex;
          justify-content: center;
          position: relative;
          z-index: 1;
        }

        .ozt-modern-logo {
          width: 82px;
          height: 82px;
          border-radius: 24px;
          object-fit: cover;
          border: 1px solid rgba(151,119,71,.25);
          background: rgba(255,255,255,.72);
          box-shadow:
            0 14px 28px rgba(76,59,37,.14),
            inset 0 1px 0 rgba(255,255,255,.92);
        }

        .ozt-modern-logo-fallback {
          width: 82px;
          height: 82px;
          border-radius: 24px;
          display: grid;
          place-items: center;
          background: linear-gradient(145deg, #c9aa70, #9a7033);
          color: #fff;
          font-weight: 900;
          letter-spacing: 2px;
          font-size: 23px;
          box-shadow: 0 14px 28px rgba(76,59,37,.16);
        }

        .ozt-modern-kicker {
          margin-top: 17px;
          text-align: center;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 2.2px;
          color: var(--ozt-gold-dark);
        }

        .ozt-modern-title {
          position: relative;
          z-index: 1;
          margin: 7px 0 0;
          text-align: center;
          font-size: clamp(28px, 7vw, 38px);
          line-height: 1.02;
          font-weight: 900;
          letter-spacing: -.7px;
        }

        .ozt-modern-description {
          position: relative;
          z-index: 1;
          margin: 10px auto 0;
          max-width: 390px;
          text-align: center;
          font-size: 13px;
          line-height: 1.55;
          color: var(--ozt-muted);
        }

        .ozt-modern-meta {
          display: flex;
          justify-content: center;
          flex-wrap: wrap;
          gap: 7px;
          margin-top: 13px;
          position: relative;
          z-index: 1;
        }

        .ozt-modern-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          min-height: 30px;
          padding: 0 11px;
          border-radius: 999px;
          border: 1px solid rgba(130,102,62,.16);
          background: rgba(255,255,255,.62);
          color: #665b4d;
          font-size: 11px;
          font-weight: 800;
          box-shadow: inset 0 1px 0 rgba(255,255,255,.85);
        }

        .ozt-modern-pill.is-open {
          color: #236641;
          border-color: rgba(35,102,65,.13);
          background: rgba(229,247,236,.9);
        }

        .ozt-modern-actions {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
          margin-top: 14px;
        }

        .ozt-modern-action {
          min-height: 76px;
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 12px;
          border-radius: 20px;
          text-decoration: none;
          color: #2d271f;
          border: 1px solid var(--ozt-line);
          background: linear-gradient(145deg, rgba(255,255,255,.94), rgba(240,233,223,.88));
          box-shadow:
            7px 9px 20px rgba(77,59,36,.08),
            -4px -4px 12px rgba(255,255,255,.7),
            inset 0 1px 0 rgba(255,255,255,.92);
          transition: transform .18s ease, box-shadow .18s ease;
          box-sizing: border-box;
        }

        .ozt-modern-action:active { transform: scale(.985); }

        .ozt-modern-action.featured {
          grid-column: 1 / -1;
          min-height: 92px;
          color: #fff;
          background: linear-gradient(135deg, #d8bf8b 0%, #b48a45 52%, #9d7539 100%);
          border-color: rgba(137,96,35,.35);
          box-shadow:
            0 14px 30px rgba(143,103,43,.23),
            inset 0 1px 0 rgba(255,255,255,.25);
        }

        .ozt-modern-action.google {
          border-color: rgba(205,157,47,.25);
        }

        .ozt-modern-icon {
          flex: 0 0 44px;
          width: 44px;
          height: 44px;
          border-radius: 15px;
          display: grid;
          place-items: center;
          font-size: 22px;
          background: rgba(255,255,255,.72);
          box-shadow: inset 0 1px 0 rgba(255,255,255,.85);
        }

        .featured .ozt-modern-icon {
          background: rgba(255,255,255,.17);
        }

        .ozt-modern-action-copy {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .ozt-modern-action-title {
          font-size: 14px;
          font-weight: 900;
          line-height: 1.1;
        }

        .ozt-modern-action-sub {
          font-size: 10px;
          line-height: 1.25;
          opacity: .72;
          font-weight: 700;
        }

        .featured .ozt-modern-action-sub { opacity: .86; }

        .ozt-modern-section {
          margin-top: 23px;
        }

        .ozt-modern-section-head {
          display: flex;
          align-items: end;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 12px;
        }

        .ozt-modern-section-kicker {
          margin: 0 0 4px;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 2px;
          color: var(--ozt-gold-dark);
        }

        .ozt-modern-section-title {
          margin: 0;
          font-size: 24px;
          letter-spacing: -.4px;
          line-height: 1.08;
          font-weight: 950;
        }

        .ozt-modern-rating-card {
          display: grid;
          grid-template-columns: 110px 1fr;
          gap: 14px;
          align-items: center;
          padding: 17px;
          border-radius: 24px;
          border: 1px solid rgba(135,111,76,.12);
          background: rgba(255,255,255,.86);
          box-shadow:
            0 14px 30px rgba(82,65,43,.09),
            inset 0 1px 0 rgba(255,255,255,.92);
        }

        .ozt-modern-rating-score {
          padding-right: 14px;
          border-right: 1px solid rgba(115,92,58,.10);
          text-align: center;
        }

        .ozt-modern-score {
          font-size: 42px;
          line-height: .95;
          font-weight: 950;
          letter-spacing: -1.5px;
        }

        .ozt-modern-stars {
          margin-top: 8px;
          color: #d89b12;
          font-size: 17px;
          letter-spacing: 1px;
        }

        .ozt-modern-count {
          margin-top: 4px;
          color: #8a7e6f;
          font-size: 9px;
          font-weight: 800;
        }

        .ozt-modern-bars {
          display: grid;
          gap: 6px;
        }

        .ozt-modern-bar-row {
          display: grid;
          grid-template-columns: 18px 1fr 18px;
          align-items: center;
          gap: 7px;
          font-size: 10px;
          color: #766b5c;
          font-weight: 800;
        }

        .ozt-modern-bar-bg {
          height: 7px;
          overflow: hidden;
          border-radius: 999px;
          background: #ece9e4;
        }

        .ozt-modern-bar-fill {
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, #dca71f, #efc65f);
        }

        .ozt-modern-reviews {
          display: grid;
          gap: 10px;
        }

        .ozt-modern-review {
          padding: 16px;
          border-radius: 22px;
          border: 1px solid rgba(135,111,76,.10);
          background: rgba(255,255,255,.88);
          box-shadow: 0 9px 22px rgba(82,65,43,.07);
        }

        .ozt-modern-review-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
        }

        .ozt-modern-review-user {
          font-size: 12px;
          font-weight: 900;
        }

        .ozt-modern-review-date {
          color: #978b7c;
          font-size: 9px;
        }

        .ozt-modern-review-stars {
          margin-top: 8px;
          color: #d89b12;
          font-size: 15px;
          letter-spacing: 1px;
        }

        .ozt-modern-review-text {
          margin: 8px 0 0;
          color: #5f564c;
          font-size: 12px;
          line-height: 1.55;
        }

        .ozt-modern-empty {
          padding: 26px 18px;
          border-radius: 22px;
          text-align: center;
          background: rgba(255,255,255,.84);
          border: 1px dashed rgba(124,101,66,.18);
        }

        .ozt-modern-empty-icon { font-size: 34px; }
        .ozt-modern-empty-title { margin: 8px 0 5px; font-size: 16px; font-weight: 900; }
        .ozt-modern-empty-text { margin: 0; color: #7c7266; font-size: 11px; }

        .ozt-modern-footer {
          padding: 24px 0 4px;
          text-align: center;
          color: #8f8374;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1px;
        }

        @media (max-width: 380px) {
          .ozt-modern-rating-card { grid-template-columns: 96px 1fr; padding: 14px; }
          .ozt-modern-action-title { font-size: 13px; }
          .ozt-modern-action-sub { display: none; }
        }

        @media (min-width: 700px) {
          .ozt-modern-home { padding-top: 28px; }
          .ozt-modern-actions { grid-template-columns: repeat(3, minmax(0, 1fr)); }
          .ozt-modern-action.featured { grid-column: 1 / -1; }
        }
      `}</style>

      <main className="ozt-modern-home">
        <div className="ozt-modern-shell">

          {/* HERO */}
          <section className="ozt-modern-hero">
            <div className="ozt-modern-logo-wrap">
              {restaurant.logo_url ? (
                <img
                  src={restaurant.logo_url}
                  alt={`${restaurant.name} logosu`}
                  className="ozt-modern-logo"
                />
              ) : (
                <div className="ozt-modern-logo-fallback">OZT</div>
              )}
            </div>

            <div className="ozt-modern-kicker">DİJİTAL RESTORAN DENEYİMİ</div>
            <h1 className="ozt-modern-title">{restaurant.name}</h1>

            {restaurant.description && (
              <p className="ozt-modern-description">
                {restaurant.description}
              </p>
            )}

            <div className="ozt-modern-meta">
              <span className="ozt-modern-pill is-open">● Açık</span>
              <span className="ozt-modern-pill">✨ Hızlı & Pratik</span>
              {table && (
                <span className="ozt-modern-pill">📍 Masa {table.table_number}</span>
              )}
            </div>
          </section>

          {/* AKSİYONLAR */}
          <section className="ozt-modern-actions">

            <a
              href={`/restoran/${restaurant.slug}/menu${tableQuery}`}
              className="ozt-modern-action featured"
            >
              <span className="ozt-modern-icon">🍽️</span>
              <span className="ozt-modern-action-copy">
                <span className="ozt-modern-action-title">MENÜ</span>
                <span className="ozt-modern-action-sub">
                  Menüye göz atın, ürünleri keşfedin ve siparişinizi oluşturun.
                </span>
              </span>
            </a>

            {restaurant.google_review_url && (
              <a
                href={restaurant.google_review_url}
                target="_blank"
                rel="noopener noreferrer"
                className="ozt-modern-action google"
              >
                <span className="ozt-modern-icon">⭐</span>
                <span className="ozt-modern-action-copy">
                  <span className="ozt-modern-action-title">Bizi Değerlendirin</span>
                  <span className="ozt-modern-action-sub">
                    Deneyiminizi paylaşın
                  </span>
                </span>
              </a>
            )}

            {table && (
              <form action={callWaiter} style={{ margin: 0 }}>
                <input type="hidden" name="slug" value={restaurant.slug} />
                <input type="hidden" name="masa" value={table.public_token} />
                <button
                  type="submit"
                  className="ozt-modern-action"
                  style={{ width: "100%", border: "none", cursor: "pointer", font: "inherit", textAlign: "left" }}
                >
                  <span className="ozt-modern-icon">🛎️</span>
                  <span className="ozt-modern-action-copy">
                    <span className="ozt-modern-action-title">
                      {garsonStatus === "ok" ? "Garson Çağrıldı" : "Garsonu Çağır"}
                    </span>
                    <span className="ozt-modern-action-sub">
                      {garsonStatus === "ok"
                        ? "Talebiniz ekibe iletildi"
                        : "Tek dokunuşla ekipten yardım isteyin"}
                    </span>
                  </span>
                </button>
              </form>
            )}

            {table && (
              <form action={requestBill} style={{ margin: 0 }}>
                <input type="hidden" name="slug" value={restaurant.slug} />
                <input type="hidden" name="masa" value={table.public_token} />
                <button
                  type="submit"
                  className="ozt-modern-action"
                  style={{
                    width: "100%",
                    border: "none",
                    cursor: "pointer",
                    font: "inherit",
                    textAlign: "left",
                  }}
                >
                  <span className="ozt-modern-icon">🧾</span>
                  <span className="ozt-modern-action-copy">
                    <span className="ozt-modern-action-title">
                      {hesapStatus === "ok" ? "Hesap İstendi" : "Hesap İste"}
                    </span>
                    <span className="ozt-modern-action-sub">
                      {hesapStatus === "ok"
                        ? "Talebiniz ekibe iletildi"
                        : "Hesabınızı istemek için dokunun"}
                    </span>
                  </span>
                </button>
              </form>
            )}

            {restaurant.instagram_url && (
              <a
                href={restaurant.instagram_url}
                target="_blank"
                rel="noopener noreferrer"
                className="ozt-modern-action"
              >
                <span className="ozt-modern-icon">📸</span>
                <span className="ozt-modern-action-copy">
                  <span className="ozt-modern-action-title">Instagram</span>
                  <span className="ozt-modern-action-sub">Bizi Takip Edin</span>
                </span>
              </a>
            )}

            <a
              href={`/restoran/${restaurant.slug}/calisan${tableQuery}`}
              className="ozt-modern-action"
            >
              <span className="ozt-modern-icon">💬</span>
              <span className="ozt-modern-action-copy">
                <span className="ozt-modern-action-title">Çalışanı Değerlendir</span>
                <span className="ozt-modern-action-sub">Hizmet deneyiminizi paylaşın</span>
              </span>
            </a>

            <a
              href={`/restoran/${restaurant.slug}/odeme${tableQuery}`}
              className="ozt-modern-action"
            >
              <span className="ozt-modern-icon">💳</span>
              <span className="ozt-modern-action-copy">
                <span className="ozt-modern-action-title">Ödeme Yap</span>
                <span className="ozt-modern-action-sub">Hızlıca hesabınızı tamamlayın</span>
              </span>
            </a>
          </section>

          <SiparisTakipLink
            slug={restaurant.slug}
            tableToken={tableToken || ""}
          />

          {/* GARSON BİLDİRİMİ */}
          {garsonStatus === "ok" && (
            <div style={{
              marginTop: 10,
              padding: "12px 14px",
              borderRadius: 16,
              background: "rgba(229,247,236,.94)",
              border: "1px solid rgba(35,102,65,.14)",
              color: "#236641",
              textAlign: "center",
              fontSize: 11,
              fontWeight: 900
            }}>
              ✅ Garson çağrınız başarıyla iletildi.
            </div>
          )}

          {garsonStatus === "hata" && (
            <div style={{
              marginTop: 10,
              padding: "12px 14px",
              borderRadius: 16,
              background: "rgba(255,239,239,.95)",
              border: "1px solid rgba(162,47,47,.15)",
              color: "#a22f2f",
              textAlign: "center",
              fontSize: 11,
              fontWeight: 900
            }}>
              ❌ Garson çağrısı gönderilemedi. Lütfen tekrar deneyin.
            </div>
          )}

          {hesapStatus === "ok" && (
            <div style={{
              marginTop: 10,
              padding: "12px 14px",
              borderRadius: 16,
              background: "rgba(229,247,236,.94)",
              border: "1px solid rgba(35,102,65,.14)",
              color: "#236641",
              textAlign: "center",
              fontSize: 11,
              fontWeight: 900
            }}>
              ✅ Hesap talebiniz başarıyla iletildi.
            </div>
          )}

          {hesapStatus === "hata" && (
            <div style={{
              marginTop: 10,
              padding: "12px 14px",
              borderRadius: 16,
              background: "rgba(255,239,239,.95)",
              border: "1px solid rgba(162,47,47,.15)",
              color: "#a22f2f",
              textAlign: "center",
              fontSize: 11,
              fontWeight: 900
            }}>
              ❌ Hesap talebi gönderilemedi. Lütfen tekrar deneyin.
            </div>
          )}

          {/* YORUMLAR */}
          <section className="ozt-modern-section">
            <div className="ozt-modern-section-head">
              <div>
                <p className="ozt-modern-section-kicker">MÜŞTERİ DENEYİMİ</p>
                <h2 className="ozt-modern-section-title">Müşterilerimiz Ne Diyor?</h2>
              </div>
              <span className="ozt-modern-pill">💛 Gerçek deneyimler</span>
            </div>

            <div className="ozt-modern-rating-card">
              <div className="ozt-modern-rating-score">
                <div className="ozt-modern-score">{averageRating}</div>
                <div className="ozt-modern-stars">
                  {"★".repeat(Math.round(Number(averageRating)))}
                </div>
                <div className="ozt-modern-count">{totalReviews} değerlendirme</div>
              </div>

              <div className="ozt-modern-bars">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = ratingCounts[star as keyof typeof ratingCounts];
                  const percentage =
                    totalReviews > 0 ? (count / totalReviews) * 100 : 0;

                  return (
                    <div className="ozt-modern-bar-row" key={star}>
                      <span>{star}★</span>
                      <div className="ozt-modern-bar-bg">
                        <div
                          className="ozt-modern-bar-fill"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span style={{ textAlign: "right" }}>{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="ozt-modern-section" style={{ marginTop: 12 }}>
            {totalReviews === 0 ? (
              <div className="ozt-modern-empty">
                <div className="ozt-modern-empty-icon">⭐</div>
                <h3 className="ozt-modern-empty-title">Henüz değerlendirme yok</h3>
                <p className="ozt-modern-empty-text">İlk deneyimi paylaşan siz olun.</p>
              </div>
            ) : (
              <div className="ozt-modern-reviews">
                {reviews?.map((review) => (
                  <article key={review.id} className="ozt-modern-review">
                    <div className="ozt-modern-review-top">
                      <strong className="ozt-modern-review-user">
                        👤 {review.customer_name || "Misafir"}
                      </strong>
                      <span className="ozt-modern-review-date">
                        {new Date(review.created_at).toLocaleDateString("tr-TR")}
                      </span>
                    </div>

                    <div className="ozt-modern-review-stars">
                      {"★".repeat(Number(review.rating))}
                      <span style={{ color: "#e8e2d9" }}>
                        {"★".repeat(5 - Number(review.rating))}
                      </span>
                    </div>

                    {review.comment && (
                      <p className="ozt-modern-review-text">
                        “{review.comment}”
                      </p>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>

          <footer className="ozt-modern-footer">
            OZT DIGITAL · DİJİTAL RESTORAN DENEYİMİ
          </footer>
        </div>
      </main>
    </>
  );
}
