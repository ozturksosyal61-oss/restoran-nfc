"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "../../../../../../lib/supabase/client";

type Order = {
  id: number;
  customer_name: string | null;
  table_number: string;
  note: string | null;
  total_amount: number;
  status: string;
  created_at: string;
};

const statusSteps = [
  {
    key: "pending",
    title: "Sipariş Alındı",
    description:
      "Siparişiniz işletmeye iletildi.",
    icon: "📝",
  },
  {
    key: "accepted",
    title: "Sipariş Onaylandı",
    description:
      "Siparişiniz işletme tarafından kabul edildi.",
    icon: "👍",
  },
  {
    key: "preparing",
    title: "Hazırlanıyor",
    description:
      "Siparişiniz şu anda hazırlanıyor.",
    icon: "👨‍🍳",
  },
  {
    key: "ready",
    title: "Sipariş Hazır",
    description:
      "Siparişiniz hazır. Teslim edilmek üzere bekliyor.",
    icon: "✅",
  },
  {
    key: "delivered",
    title: "Teslim Edildi",
    description:
      "Siparişiniz teslim edildi. Afiyet olsun!",
    icon: "🎉",
  },
];

export default function OrderTrackingPage() {
  const params = useParams();

  const slug = params.slug as string;
  const orderId = Number(params.id);

  const [order, setOrder] =
    useState<Order | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");
    const [rating, setRating] = useState(0);
const [reviewComment, setReviewComment] = useState("");
const [reviewLoading, setReviewLoading] = useState(false);
const [reviewSubmitted, setReviewSubmitted] = useState(false);
const [reviewError, setReviewError] = useState("");

  useEffect(() => {
    if (!orderId || Number.isNaN(orderId)) {
      setError("Geçersiz sipariş numarası.");
      setLoading(false);
      return;
    }

    const supabase = createClient();

    let mounted = true;

    async function loadOrder() {
      const { data, error } = await supabase
        .from("orders")
        .select(
          `
          id,
          customer_name,
          table_number,
          note,
          total_amount,
          status,
          created_at
        `
        )
        .eq("id", orderId)
        .single();

      if (!mounted) {
        return;
      }

      if (error || !data) {
        console.error(
          "Sipariş yüklenemedi:",
          error
        );

        setError(
          "Sipariş bulunamadı."
        );

        setLoading(false);
        return;
      }

      setOrder(data);
      setLoading(false);
    }

    loadOrder();

    // --------------------------------------------
    // CANLI SİPARİŞ DURUMU
    // --------------------------------------------

    const channel = supabase
  .channel(`order-tracking-${orderId}`)
  .on(
    "postgres_changes",
    {
      event: "UPDATE",
      schema: "public",
      table: "orders",
      filter: `id=eq.${orderId}`,
    },
    (payload: {
      new: Order;
      old: Partial<Order>;
    }) => {
      console.log(
        "🔄 Sipariş güncellendi:",
        payload.new
      );

      if (!mounted) {
        return;
      }

      setOrder(payload.new);
    }
  )
  .subscribe((status: string) => {
    console.log(
      "Realtime durumu:",
      status
    );
  });
    return () => {
      mounted = false;

      supabase.removeChannel(
        channel
      );
    };
  }, [orderId]);
    // --------------------------------------------
  // DEĞERLENDİRME GÖNDER
  // --------------------------------------------

  async function submitReview() {
      if (!order) {
    setReviewError("Sipariş bilgileri yüklenemedi.");
    return;
  }
    if (rating < 1 || rating > 5) {
      setReviewError("Lütfen 1 ile 5 arasında bir puan seçin.");
      return;
    }

    setReviewLoading(true);
    setReviewError("");

    try {
      const supabase = createClient();

      // Restoranı slug üzerinden bul
      const { data: restaurant, error: restaurantError } =
        await supabase
          .from("restaurants")
          .select("id")
          .eq("slug", slug)
          .single();

      if (restaurantError || !restaurant) {
        setReviewError("İşletme bulunamadı.");
        setReviewLoading(false);
        return;
      }

      const { error } = await supabase
        .from("reviews")
        .insert({
          order_id: order.id,
          restaurant_id: restaurant.id,
          customer_name: order.customer_name || null,
          rating,
          comment: reviewComment.trim() || null,
          is_visible: true,
        });

      if (error) {
        console.error("Değerlendirme hatası:", error);

        if (error.code === "23505") {
          setReviewError(
            "Bu sipariş için zaten bir değerlendirme yapılmış."
          );
        } else {
          setReviewError(
            "Değerlendirme gönderilemedi: " +
              error.message
          );
        }

        setReviewLoading(false);
        return;
      }

      setReviewSubmitted(true);
      setReviewLoading(false);
    } catch (error) {
      console.error(error);

      setReviewError(
        "Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin."
      );

      setReviewLoading(false);
    }
  }

  // --------------------------------------------
  // YÜKLENİYOR
  // --------------------------------------------

  if (loading) {
    return (
      <main className="restaurant-page">
        <section className="order-tracking-page">
          <div className="tracking-loading">
            <div className="tracking-loading-icon">
              ⏳
            </div>

            <h1>
              Siparişiniz yükleniyor...
            </h1>

            <p>
              Lütfen birkaç saniye bekleyin.
            </p>
          </div>
        </section>
      </main>
    );
  }

  // --------------------------------------------
  // HATA
  // --------------------------------------------

  if (error || !order) {
    return (
      <main className="restaurant-page">
        <section className="order-tracking-page">
          <div className="tracking-error">
            <div className="tracking-error-icon">
              ❌
            </div>

            <h1>
              Sipariş Bulunamadı
            </h1>

            <p>
              {error ||
                "Sipariş bilgilerine ulaşılamadı."}
            </p>

            <a
              href={`/restoran/${slug}/menu`}
              className="tracking-back-button"
            >
              Menüye Dön
            </a>
          </div>
        </section>
      </main>
    );
  }

  // --------------------------------------------
  // AKTİF ADIMI BUL
  // --------------------------------------------

  const currentIndex =
    statusSteps.findIndex(
      (step) =>
        step.key === order.status
    );

  const activeIndex =
    currentIndex === -1
      ? 0
      : currentIndex;

  const currentStep =
    statusSteps[activeIndex];

  // --------------------------------------------
  // TARİH
  // --------------------------------------------

  const orderDate =
    new Date(order.created_at);

  const formattedDate =
    orderDate.toLocaleString(
      "tr-TR",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    );

  return (
    <main className="restaurant-page">
      {/* -------------------------------------- */}
      {/* ÜST BAŞLIK */}
      {/* -------------------------------------- */}

      <section className="order-tracking-hero">
        <div>
          <span className="tracking-eyebrow">
            SİPARİŞ TAKİBİ
          </span>

          <h1>
            Sipariş #{order.id}
          </h1>

          <p>
            Siparişinizin güncel durumunu
            buradan takip edebilirsiniz.
          </p>
        </div>

        <div className="tracking-live-badge">
          <span />
          CANLI
        </div>
      </section>

      {/* -------------------------------------- */}
      {/* MEVCUT DURUM */}
      {/* -------------------------------------- */}

      <section className="current-order-status">
        <div className="current-status-icon">
          {currentStep?.icon || "📝"}
        </div>

        <div className="current-status-content">
          <span>
            ŞU ANDA
          </span>

          <h2>
            {currentStep?.title ||
              "Sipariş Alındı"}
          </h2>

          <p>
            {currentStep?.description ||
              "Siparişiniz alınmıştır."}
          </p>
        </div>

        <div className="live-dot">
          <span />
          Canlı
        </div>
      </section>

      {/* -------------------------------------- */}
      {/* SİPARİŞ DURUM ADIMLARI */}
      {/* -------------------------------------- */}

      <section className="tracking-card">
        <div className="tracking-card-header">
          <div>
            <span>
              SİPARİŞ DURUMU
            </span>

            <h2>
              Siparişiniz Nerede?
            </h2>
          </div>

          <div className="tracking-order-number">
            #{order.id}
          </div>
        </div>

        <div className="tracking-timeline">
          {statusSteps.map(
            (step, index) => {
              const isCompleted =
                index < activeIndex;

              const isActive =
                index === activeIndex;

              const isFuture =
                index > activeIndex;

              return (
                <div
                  className={`tracking-step ${
                    isCompleted
                      ? "completed"
                      : ""
                  } ${
                    isActive
                      ? "active"
                      : ""
                  } ${
                    isFuture
                      ? "future"
                      : ""
                  }`}
                  key={step.key}
                >
                  <div className="tracking-step-left">
                    <div className="tracking-step-icon">
                      {isCompleted
                        ? "✓"
                        : step.icon}
                    </div>

                    {index <
                      statusSteps.length -
                        1 && (
                      <div className="tracking-step-line" />
                    )}
                  </div>

                  <div className="tracking-step-content">
                    <h3>
                      {step.title}
                    </h3>

                    <p>
                      {step.description}
                    </p>

                    {isActive && (
                      <span className="tracking-active-label">
                        ● Şu anda burada
                      </span>
                    )}
                  </div>
                </div>
              );
            }
          )}
        </div>
      </section>

      {/* -------------------------------------- */}
      {/* SİPARİŞ BİLGİLERİ */}
      {/* -------------------------------------- */}

      <section className="tracking-info-card">
        <div className="tracking-info-header">
          <span>
            SİPARİŞ BİLGİLERİ
          </span>

          <h2>
            Sipariş Detayları
          </h2>
        </div>

        <div className="tracking-info-grid">
          <div className="tracking-info-item">
            <span>
              🪑 Masa
            </span>

            <strong>
              {order.table_number}
            </strong>
          </div>

          <div className="tracking-info-item">
            <span>
              👤 Müşteri
            </span>

            <strong>
              {order.customer_name ||
                "Misafir"}
            </strong>
          </div>

          <div className="tracking-info-item">
            <span>
              🕐 Sipariş Saati
            </span>

            <strong>
              {formattedDate}
            </strong>
          </div>

          <div className="tracking-info-item">
            <span>
              💰 Toplam
            </span>

            <strong>
              {Number(
                order.total_amount
              ).toLocaleString(
                "tr-TR"
              )}{" "}
              TL
            </strong>
          </div>
        </div>

        {order.note && (
          <div className="tracking-note">
            <span>
              📝 Sipariş Notu
            </span>

            <p>
              {order.note}
            </p>
          </div>
        )}
      </section>
            {/* -------------------------------------- */}
      {/* DEĞERLENDİRME */}
      {/* -------------------------------------- */}

      {order.status === "delivered" && (
        <section className="review-card">
          {!reviewSubmitted ? (
            <>
              <div className="review-header">
                <span className="review-eyebrow">
                  DENEYİMİNİZİ PAYLAŞIN
                </span>

                <h2>
                  Siparişinizi nasıl buldunuz?
                </h2>

                <p>
                  Görüşünüz bizim için çok değerli.
                </p>
              </div>

              {/* YILDIZLAR */}

              <div className="review-stars">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    aria-label={`${star} yıldız`}
                    className={
                      star <= rating
                        ? "review-star active"
                        : "review-star"
                    }
                  >
                    ★
                  </button>
                ))}
              </div>

              {rating > 0 && (
                <div className="review-rating-text">
                  {rating === 1 && "Çok kötü"}
                  {rating === 2 && "Kötü"}
                  {rating === 3 && "Ortalama"}
                  {rating === 4 && "Çok iyi"}
                  {rating === 5 && "Mükemmel! ❤️"}
                </div>
              )}

              {/* YORUM */}

              <textarea
                value={reviewComment}
                onChange={(event) =>
                  setReviewComment(event.target.value)
                }
                placeholder="Siparişiniz hakkında ne düşünüyorsunuz? (İsteğe bağlı)"
                className="review-textarea"
                rows={4}
              />

              {reviewError && (
                <div className="review-error">
                  ❌ {reviewError}
                </div>
              )}

              <button
                type="button"
                onClick={submitReview}
                disabled={
                  reviewLoading || rating === 0
                }
                className="review-submit-button"
              >
                {reviewLoading
                  ? "Gönderiliyor..."
                  : "⭐ Değerlendirmeyi Gönder"}
              </button>
            </>
          ) : (
            <div className="review-success">
              <div className="review-success-icon">
                ⭐
              </div>

              <h2>
                Teşekkür ederiz!
              </h2>

              <p>
                Değerlendirmeniz başarıyla gönderildi.
              </p>

              <div className="review-success-stars">
                {"★".repeat(rating)}
              </div>
            </div>
          )}
        </section>
      )}

      {/* -------------------------------------- */}
      {/* ALT BİLGİ */}
      {/* -------------------------------------- */}

      <div className="tracking-footer">
        <div>
          🔄 Sipariş durumu otomatik
          olarak güncelleniyor.
        </div>

        <div>
          Lütfen bu sayfayı kapatmayın.
        </div>
      </div>
    </main>
  );
}