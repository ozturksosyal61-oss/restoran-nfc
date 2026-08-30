import { createSupabaseServerClient } from "../../../lib/supabase-server";
import { notFound } from "next/navigation";
import ReviewActions from "./ReviewActions";

export default async function ReviewsPage() {
  const supabase = await createSupabaseServerClient();

  // Giriş yapan kullanıcıyı bul
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  // Kullanıcının restoranını bul
  const { data: membership } = await supabase
    .from("restaurant_users")
    .select("restaurant_id")
    .eq("user_id", user.id)
    .single();

  if (!membership?.restaurant_id) {
    notFound();
  }

  // Restoran bilgisi
  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id, name")
    .eq("id", membership.restaurant_id)
    .single();

  if (!restaurant) {
    notFound();
  }

  // Değerlendirmeleri getir
  const { data: reviews, error } = await supabase
    .from("reviews")
    .select(
      "id, customer_name, rating, comment, is_visible, created_at"
    )
    .eq("restaurant_id", restaurant.id)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    console.error("Değerlendirmeler alınamadı:", error);
  }

  const reviewList = reviews || [];

  // Ortalama puan
  const averageRating =
    reviewList.length > 0
      ? reviewList.reduce(
          (sum, review) => sum + review.rating,
          0
        ) / reviewList.length
      : 0;

  // Yıldız dağılımı
  const starCounts = {
    5: reviewList.filter(
      (review) => review.rating === 5
    ).length,

    4: reviewList.filter(
      (review) => review.rating === 4
    ).length,

    3: reviewList.filter(
      (review) => review.rating === 3
    ).length,

    2: reviewList.filter(
      (review) => review.rating === 2
    ).length,

    1: reviewList.filter(
      (review) => review.rating === 1
    ).length,
  };

  return (
    <main className="admin-page">

      {/* =========================
          ÜST ALAN
      ========================= */}

      <section className="admin-header">

        <a
          href="/admin"
          style={{
            color: "#c8941d",
            textDecoration: "none",
            fontWeight: 700,
          }}
        >
          ← Yönetim Paneli
        </a>

        <div
          style={{
            marginTop: "18px",
          }}
        >
          <span
            style={{
              color: "#c8941d",
              fontSize: "12px",
              fontWeight: 800,
              letterSpacing: "2px",
            }}
          >
            MÜŞTERİ GERİ BİLDİRİMLERİ
          </span>

          <h1>Değerlendirmeler</h1>

          <p>
            {restaurant.name} müşterilerinin
            değerlendirmelerini buradan görüntüleyin.
          </p>
        </div>

      </section>

      {/* =========================
          İSTATİSTİKLER
      ========================= */}

      <section
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "16px",
          marginTop: "20px",
        }}
      >

        {/* Ortalama */}

        <div className="admin-card">

          <span>⭐</span>

          <h2>
            {averageRating.toFixed(1)}
          </h2>

          <p>
            Ortalama Puan
          </p>

        </div>

        {/* Toplam */}

        <div className="admin-card">

          <span>💬</span>

          <h2>
            {reviewList.length}
          </h2>

          <p>
            Toplam Değerlendirme
          </p>

        </div>

        {/* Yayındaki */}

        <div className="admin-card">

          <span>🟢</span>

          <h2>
            {
              reviewList.filter(
                (review) => review.is_visible
              ).length
            }
          </h2>

          <p>
            Yayındaki Değerlendirme
          </p>

        </div>

      </section>

      {/* =========================
          YILDIZ DAĞILIMI
      ========================= */}

      <section
        style={{
          background: "white",
          borderRadius: "18px",
          padding: "24px",
          marginTop: "20px",
          boxShadow:
            "0 10px 30px rgba(0,0,0,0.06)",
        }}
      >

        <h2>
          ⭐ Puan Dağılımı
        </h2>

        {[5, 4, 3, 2, 1].map((star) => {

          const count =
            starCounts[
              star as keyof typeof starCounts
            ];

          const percentage =
            reviewList.length > 0
              ? (count / reviewList.length) * 100
              : 0;

          return (
            <div
              key={star}
              style={{
                display: "grid",
                gridTemplateColumns:
                  "60px 1fr 50px",
                alignItems: "center",
                gap: "10px",
                marginTop: "12px",
              }}
            >

              <strong>
                {star} ⭐
              </strong>

              <div
                style={{
                  height: "9px",
                  background: "#eee",
                  borderRadius: "20px",
                  overflow: "hidden",
                }}
              >

                <div
                  style={{
                    width: `${percentage}%`,
                    height: "100%",
                    background: "#d59b19",
                    borderRadius: "20px",
                  }}
                />

              </div>

              <span>
                {count}
              </span>

            </div>
          );
        })}

      </section>

      {/* =========================
          DEĞERLENDİRMELER
      ========================= */}

      <section
        style={{
          marginTop: "28px",
        }}
      >

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >

          <div>

            <span
              style={{
                color: "#c8941d",
                fontSize: "12px",
                fontWeight: 800,
                letterSpacing: "2px",
              }}
            >
              MÜŞTERİ YORUMLARI
            </span>

            <h2
              style={{
                marginTop: "5px",
              }}
            >
              Son Değerlendirmeler
            </h2>

          </div>

          <span
            style={{
              background: "white",
              border: "1px solid #e5dfd3",
              padding: "8px 12px",
              borderRadius: "20px",
              fontSize: "13px",
              fontWeight: 700,
            }}
          >
            {reviewList.length} değerlendirme
          </span>

        </div>

        {/* DEĞERLENDİRME YOK */}

        {reviewList.length === 0 ? (

          <div
            style={{
              background: "white",
              borderRadius: "18px",
              padding: "45px 20px",
              textAlign: "center",
              boxShadow:
                "0 10px 30px rgba(0,0,0,0.05)",
            }}
          >

            <div
              style={{
                fontSize: "42px",
                marginBottom: "12px",
              }}
            >
              ⭐
            </div>

            <h3>
              Henüz değerlendirme yok
            </h3>

            <p
              style={{
                color: "#777",
                marginTop: "8px",
              }}
            >
              Müşterileriniz değerlendirme
              yaptığında burada görünecek.
            </p>

          </div>

        ) : (

          /* DEĞERLENDİRME LİSTESİ */

          <div
            style={{
              display: "grid",
              gap: "14px",
            }}
          >

            {reviewList.map((review) => (

              <article
                key={review.id}
                style={{
                  background: "white",
                  borderRadius: "18px",
                  padding: "20px",
                  boxShadow:
                    "0 10px 30px rgba(0,0,0,0.05)",

                  border:
                    review.is_visible
                      ? "1px solid #eee"
                      : "1px solid #f0caca",
                }}
              >

                {/* ÜST BİLGİ */}

                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    gap: "15px",
                    flexWrap: "wrap",
                  }}
                >

                  <div>

                    <strong>
                      👤{" "}
                      {review.customer_name ||
                        "Anonim Müşteri"}
                    </strong>

                    {/* YILDIZLAR */}

                    <div
                      style={{
                        marginTop: "7px",
                        fontSize: "18px",
                      }}
                    >

                      {"⭐".repeat(
                        review.rating
                      )}

                      <span
                        style={{
                          color: "#aaa",
                        }}
                      >
                        {"⭐".repeat(
                          5 - review.rating
                        )}
                      </span>

                    </div>

                  </div>

                  {/* TARİH + DURUM */}

                  <div
                    style={{
                      textAlign: "right",
                      fontSize: "12px",
                      color: "#888",
                    }}
                  >

                    {new Date(
                      review.created_at
                    ).toLocaleDateString(
                      "tr-TR"
                    )}

                    <div
                      style={{
                        marginTop: "6px",
                        display: "inline-block",
                        padding: "4px 8px",
                        borderRadius: "10px",

                        background:
                          review.is_visible
                            ? "#e8f7ed"
                            : "#fdeaea",

                        color:
                          review.is_visible
                            ? "#258345"
                            : "#b33a3a",

                        fontWeight: 700,
                      }}
                    >

                      {review.is_visible
                        ? "Yayında"
                        : "Gizli"}

                    </div>

                  </div>

                </div>

                {/* YORUM */}

                {review.comment && (

                  <p
                    style={{
                      marginTop: "15px",
                      paddingTop: "15px",
                      borderTop:
                        "1px solid #eee",
                      lineHeight: 1.6,
                      color: "#444",
                    }}
                  >
                    “{review.comment}”
                  </p>

                )}

                {/* BUTONLAR */}

                <ReviewActions
                  reviewId={review.id}
                  isVisible={review.is_visible}
                />

              </article>

            ))}

          </div>

        )}

      </section>

    </main>
  );
}