import { createSupabaseServerClient } from "../../../lib/supabase-server";
import { notFound } from "next/navigation";
import ReviewActions from "./ReviewActions";
import AdminIcon from "../AdminIcon";

export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ durum?: string }>;
}) {
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

  const { durum } = await searchParams;
  const filter = durum === "gizli" || durum === "yayinda" ? durum : "tumu";
  const visibleCount = reviewList.filter((review) => review.is_visible).length;
  const hiddenCount = reviewList.length - visibleCount;
  const shown = reviewList.filter((review) =>
    filter === "tumu" ? true : filter === "yayinda" ? review.is_visible : !review.is_visible
  );

  return (
    <main className="adm-page">
      <header className="adm-head">
        <div className="adm-head-text">
          <span className="adm-eyebrow">Müşteri geri bildirimi</span>
          <h1>Değerlendirmeler</h1>
          <p>
            Siparişe bağlı yorumlar doğrudan yayına girer. Çalışan değerlendirmeleri
            siz onaylayana kadar gizli kalır.
          </p>
        </div>
      </header>

      <div className="adm-split adm-split-reverse">
        <section className="adm-card adm-rating-summary" aria-label="Puan özeti">
          <div className="adm-rating-big">
            <strong>{reviewList.length > 0 ? averageRating.toFixed(1) : "—"}</strong>
            <span className="adm-stars" aria-label={`5 üzerinden ${averageRating.toFixed(1)}`}>
              {[1, 2, 3, 4, 5].map((star) => (
                <AdminIcon
                  key={star}
                  name="star"
                  size={16}
                  strokeWidth={star <= Math.round(averageRating) ? 0 : 1.6}
                />
              ))}
            </span>
            <small>{reviewList.length} değerlendirme</small>
          </div>

          <div className="adm-rating-bars">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = starCounts[star as keyof typeof starCounts];
              const percentage = reviewList.length > 0 ? (count / reviewList.length) * 100 : 0;
              return (
                <div key={star} className="adm-rating-bar">
                  <span>{star}</span>
                  <span className="adm-rating-track">
                    <span style={{ width: `${percentage}%` }} />
                  </span>
                  <b>{count}</b>
                </div>
              );
            })}
          </div>
        </section>

        <section className="adm-section" aria-labelledby="yorum-listesi">
          <div className="adm-section-head">
            <h2 id="yorum-listesi">Yorumlar</h2>
            <nav className="adm-chips" aria-label="Yorumları filtrele">
              <a className={`adm-chip ${filter === "tumu" ? "is-active" : ""}`} href="/admin/degerlendirmeler">
                Tümü <b>{reviewList.length}</b>
              </a>
              <a className={`adm-chip ${filter === "gizli" ? "is-active" : ""}`} href="/admin/degerlendirmeler?durum=gizli">
                Onay bekleyen <b>{hiddenCount}</b>
              </a>
              <a className={`adm-chip ${filter === "yayinda" ? "is-active" : ""}`} href="/admin/degerlendirmeler?durum=yayinda">
                Yayında <b>{visibleCount}</b>
              </a>
            </nav>
          </div>

          {shown.length === 0 ? (
            <div className="adm-empty">
              <span className="adm-empty-icon"><AdminIcon name="star" /></span>
              <strong>{reviewList.length === 0 ? "Henüz değerlendirme yok" : "Bu filtrede yorum yok"}</strong>
              <p>Müşteriler sipariş sonrası ya da çalışan sayfasından değerlendirme yaptığında burada görünür.</p>
            </div>
          ) : (
            <div className="adm-reviews">
              {shown.map((review) => (
                <article key={review.id} className={`adm-card adm-review ${review.is_visible ? "" : "is-hidden"}`}>
                  <div className="adm-review-head">
                    <span className="adm-review-avatar">
                      {(review.customer_name || "M").trim().charAt(0).toLocaleUpperCase("tr-TR")}
                    </span>
                    <span className="adm-row-main">
                      <strong>{review.customer_name || "Misafir"}</strong>
                      <small>
                        {new Date(review.created_at).toLocaleDateString("tr-TR", { timeZone: "Europe/Istanbul",
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </small>
                    </span>
                    <span className="adm-stars" aria-label={`${review.rating} yıldız`}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <AdminIcon key={star} name="star" size={14} strokeWidth={star <= review.rating ? 0 : 1.6} />
                      ))}
                    </span>
                  </div>

                  {review.comment && <p className="adm-review-text">{review.comment}</p>}

                  <div className="adm-review-foot">
                    <span className={`adm-badge is-dot ${review.is_visible ? "s-ok" : "s-pending"}`}>
                      {review.is_visible ? "Yayında" : "Onay bekliyor"}
                    </span>
                    <ReviewActions reviewId={review.id} isVisible={review.is_visible} />
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
