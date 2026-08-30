import { notFound } from "next/navigation";
import { supabase } from "../../../lib/supabase";

export default async function RestaurantPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ masa?: string | string[] }>;
}) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  const rawTableToken = resolvedSearchParams.masa;
  const tableToken = Array.isArray(rawTableToken)
    ? rawTableToken[0]
    : rawTableToken;

  // --------------------------------------------------
  // RESTORANI GETİR
  // --------------------------------------------------

  const { data: restaurant, error } = await supabase
    .from("restaurants")
    .select(
      "id, name, slug, description, instagram_url, google_review_url, logo_url"
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

  return (
    <main className="restaurant-page">

      {/* ==================================================
          HERO
      ================================================== */}

      <section className="hero">

        {restaurant.logo_url ? (
          <img
            src={restaurant.logo_url}
            alt={`${restaurant.name} logosu`}
            className="restaurant-logo"
          />
        ) : (
          <div className="logo">
            OZT
          </div>
        )}

        <h1>{restaurant.name}</h1>

        <p>
          {restaurant.description}
        </p>

        <span>
          {restaurant.slug}
        </span>

        {table && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              marginTop: "14px",
              padding: "8px 14px",
              borderRadius: "999px",
              background: "rgba(224,160,0,0.12)",
              border: "1px solid rgba(224,160,0,0.35)",
              color: "#d99b00",
              fontWeight: 800,
              fontSize: "13px",
            }}
          >
            📍 Masa {table.table_number}
          </div>
        )}

      </section>


      {/* ==================================================
          BUTONLAR
      ================================================== */}

      <section className="actions">

        <a
          href={`/restoran/${restaurant.slug}/menu${tableQuery}`}
          className="action-button primary-action"
        >
          🍽️ Dijital Menü
        </a>

        {restaurant.google_review_url && (
          <a
            href={restaurant.google_review_url}
            target="_blank"
            rel="noopener noreferrer"
            className="action-button"
          >
            ⭐ Google'da Yorum Yap
          </a>
        )}

        {restaurant.instagram_url && (
          <a
            href={restaurant.instagram_url}
            target="_blank"
            rel="noopener noreferrer"
            className="action-button"
          >
            📷 Instagram
          </a>
        )}

        <a
          href={`/restoran/${restaurant.slug}/siparis${tableQuery}`}
          className="action-button"
        >
          🛎️ Sipariş Ver
        </a>

        <a
          href={`/restoran/${restaurant.slug}/calisan${tableQuery}`}
          className="action-button"
        >
          👤 Çalışanı Değerlendir
        </a>

        <a
          href={`/restoran/${restaurant.slug}/odeme${tableQuery}`}
          className="action-button"
        >
          💳 Ödeme Yap
        </a>

      </section>


      {/* ==================================================
          MÜŞTERİ DEĞERLENDİRMELERİ
      ================================================== */}

      <section
        style={{
          width: "100%",
          maxWidth: "520px",
          margin: "30px auto 0",
          padding: "0 16px 40px",
          boxSizing: "border-box",
        }}
      >

        {/* BAŞLIK */}

        <div
          style={{
            marginBottom: "18px",
          }}
        >

          <div
            style={{
              fontSize: "11px",
              fontWeight: 800,
              letterSpacing: "2px",
              color: "#d99b00",
              marginBottom: "6px",
            }}
          >
            MÜŞTERİ YORUMLARI
          </div>

          <h2
            style={{
              margin: 0,
              fontSize: "25px",
              fontWeight: 800,
            }}
          >
            Müşterilerimiz Ne Diyor?
          </h2>

        </div>


        {/* ==================================================
            PUAN ÖZETİ
        ================================================== */}

        <div
          style={{
            background: "#fff",
            borderRadius: "18px",
            padding: "22px",
            marginBottom: "18px",
            border: "1px solid #eee",
            boxShadow:
              "0 8px 25px rgba(0,0,0,0.05)",
          }}
        >

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "18px",
            }}
          >

            {/* ORTALAMA */}

            <div
              style={{
                textAlign: "center",
                minWidth: "90px",
              }}
            >

              <div
                style={{
                  fontSize: "38px",
                  fontWeight: 900,
                  lineHeight: 1,
                }}
              >
                {averageRating}
              </div>

              <div
                style={{
                  color: "#e0a000",
                  fontSize: "20px",
                  marginTop: "6px",
                }}
              >
                {"★".repeat(
                  Math.round(
                    Number(averageRating)
                  )
                )}
              </div>

              <div
                style={{
                  fontSize: "12px",
                  color: "#777",
                  marginTop: "4px",
                }}
              >
                {totalReviews} değerlendirme
              </div>

            </div>


            {/* DAĞILIM */}

            <div
              style={{
                flex: 1,
              }}
            >

              {[5, 4, 3, 2, 1].map(
                (star) => {

                  const count =
                    ratingCounts[
                      star as keyof typeof ratingCounts
                    ];

                  const percentage =
                    totalReviews > 0
                      ? (count / totalReviews) *
                        100
                      : 0;

                  return (
                    <div
                      key={star}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        marginBottom: "5px",
                        fontSize: "12px",
                      }}
                    >

                      <span
                        style={{
                          width: "20px",
                          fontWeight: 700,
                        }}
                      >
                        {star}★
                      </span>

                      <div
                        style={{
                          flex: 1,
                          height: "7px",
                          background: "#eee",
                          borderRadius: "20px",
                          overflow: "hidden",
                        }}
                      >

                        <div
                          style={{
                            width: `${percentage}%`,
                            height: "100%",
                            background:
                              "#e0a000",
                            borderRadius:
                              "20px",
                          }}
                        />

                      </div>

                      <span
                        style={{
                          width: "18px",
                          textAlign: "right",
                          color: "#777",
                        }}
                      >
                        {count}
                      </span>

                    </div>
                  );
                }
              )}

            </div>

          </div>

        </div>


        {/* ==================================================
            YORUMLAR
        ================================================== */}

        {totalReviews === 0 ? (

          <div
            style={{
              background: "#fff",
              borderRadius: "18px",
              padding: "35px 20px",
              textAlign: "center",
              border: "1px solid #eee",
            }}
          >

            <div
              style={{
                fontSize: "42px",
                marginBottom: "10px",
              }}
            >
              ⭐
            </div>

            <h3
              style={{
                margin: "0 0 8px",
                fontSize: "18px",
              }}
            >
              Henüz değerlendirme yok
            </h3>

            <p
              style={{
                margin: 0,
                color: "#777",
                fontSize: "14px",
              }}
            >
              İlk değerlendirmeyi siz yapın!
            </p>

          </div>

        ) : (

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "14px",
            }}
          >

            {reviews?.map((review) => (

              <article
                key={review.id}
                style={{
                  background: "#fff",
                  borderRadius: "18px",
                  padding: "20px",
                  border: "1px solid #eee",
                  boxShadow:
                    "0 6px 20px rgba(0,0,0,0.04)",
                }}
              >

                {/* MÜŞTERİ + TARİH */}

                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    alignItems: "center",
                    gap: "10px",
                    marginBottom: "8px",
                  }}
                >

                  <strong
                    style={{
                      fontSize: "15px",
                    }}
                  >
                    👤{" "}
                    {review.customer_name ||
                      "Misafir"}
                  </strong>

                  <span
                    style={{
                      fontSize: "11px",
                      color: "#888",
                    }}
                  >
                    {new Date(
                      review.created_at
                    ).toLocaleDateString(
                      "tr-TR"
                    )}
                  </span>

                </div>


                {/* YILDIZ */}

                <div
                  style={{
                    color: "#e0a000",
                    fontSize: "20px",
                    letterSpacing: "1px",
                    marginBottom: "10px",
                  }}
                >
                  {"★".repeat(
                    Number(review.rating)
                  )}
                  <span
                    style={{
                      color: "#ddd",
                    }}
                  >
                    {"★".repeat(
                      5 -
                        Number(
                          review.rating
                        )
                    )}
                  </span>
                </div>


                {/* YORUM */}

                {review.comment && (
                  <p
                    style={{
                      margin: 0,
                      color: "#444",
                      lineHeight: 1.6,
                      fontSize: "14px",
                    }}
                  >
                    “{review.comment}”
                  </p>
                )}

              </article>

            ))}

          </div>

        )}

      </section>


      {/* ==================================================
          FOOTER
      ================================================== */}

      <footer className="restaurant-footer">
        <p>
          OZT Dijital Menü
        </p>
      </footer>

    </main>
  );

}