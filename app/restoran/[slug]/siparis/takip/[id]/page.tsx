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

type OrderItem = {
  id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  total_price: number;
  product_name: string;
  image_url: string | null;
};

const statusSteps = [
  {
    key: "pending",
    title: "Sipariş Alındı",
    description: "Siparişiniz işletmeye iletildi.",
    icon: "📝",
  },
  {
    key: "accepted",
    title: "Sipariş Onaylandı",
    description: "Siparişiniz işletme tarafından kabul edildi.",
    icon: "👍",
  },
  {
    key: "preparing",
    title: "Hazırlanıyor",
    description: "Siparişiniz şu anda hazırlanıyor.",
    icon: "👨‍🍳",
  },
  {
    key: "ready",
    title: "Sipariş Hazır",
    description: "Siparişiniz hazır. Teslim edilmek üzere bekliyor.",
    icon: "✅",
  },
  {
    key: "delivered",
    title: "Teslim Edildi",
    description: "Siparişiniz teslim edildi. Afiyet olsun!",
    icon: "🎉",
  },
];

export default function OrderTrackingPage() {
  const params = useParams();

  const slug = params.slug as string;
  const orderId = Number(params.id);

  const [tableToken, setTableToken] = useState("");

  // =====================================================
  // QR / NFC MASA TOKENINI GÜVENLİ ŞEKİLDE BUL
  // =====================================================
  // ÖNEMLİ:
  // QR linkindeki "masa" değeri bazen "5" gibi masa numarasıdır.
  // Bu değeri doğrudan public_token olarak göndermek yanlıştı.
  // Önce gerçek token anahtarlarını, sonra localStorage'ı kontrol ediyoruz.
  useEffect(() => {
    if (typeof window === "undefined") return;

    const searchParams = new URLSearchParams(window.location.search);

    const isLikelyToken = (value: string | null) => {
      if (!value) return false;

      const cleaned = value.trim();

      const uuidLike =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

      if (uuidLike.test(cleaned)) return true;

      return cleaned.length >= 16 && /[a-zA-Z]/.test(cleaned);
    };

    const candidates = [
      searchParams.get("public_token"),
      searchParams.get("table_token"),
      searchParams.get("masa_token"),
      searchParams.get("token"),
      isLikelyToken(searchParams.get("masa"))
        ? searchParams.get("masa")
        : null,
      localStorage.getItem("ozt_table_token"),
      localStorage.getItem("ozt_table_public_token"),
      localStorage.getItem("table_token"),
      localStorage.getItem("public_token"),
      localStorage.getItem("masa_token"),
    ];

    const resolvedToken =
      candidates
        .map((value) => value?.trim() || "")
        .find((value) => isLikelyToken(value)) || "";

    if (resolvedToken) {
      setTableToken(resolvedToken);
      localStorage.setItem("ozt_table_token", resolvedToken);
    } else {
      console.warn(
        "⚠️ QR/NFC masa tokenı bulunamadı.",
        {
          url: window.location.href,
          masa: searchParams.get("masa"),
        }
      );

      setError(
        "Masa doğrulama bilgisi bulunamadı. Lütfen QR/NFC kodunu tekrar okutun."
      );
      setLoading(false);
    }
  }, []);


  const [order, setOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

    // =====================================================
    // SİPARİŞİ GÜVENLİ ŞEKİLDE YÜKLE
    // =====================================================

    async function loadOrder() {
      try {
        if (!tableToken) {
          // Token ayrı bir effect içinde çözümleniyor.
          // Bu ilk çalışmada hata göstermeden bekle.
          return;
        }

        const {
          data,
          error: orderError,
        } = await supabase.rpc(
          "get_public_order",
          {
            p_order_id: orderId,
            p_table_token: tableToken,
          }
        );

        if (!mounted) return;

        if (
          orderError ||
          !data ||
          !data.order
        ) {
          console.error(
            "Sipariş takip RPC hatası:",
            orderError
          );

          setError(
            "Sipariş bulunamadı veya bu masa ile eşleşmiyor."
          );
          setLoading(false);
          return;
        }

        const orderData = data.order;
        const itemsData = Array.isArray(data.items)
          ? data.items
          : [];

        const formattedItems: OrderItem[] =
          itemsData.map((item: any) => ({
            id: Number(item.id),
            product_id: Number(item.product_id),
            quantity: Number(item.quantity),
            unit_price: Number(item.unit_price),
            total_price: Number(item.total_price),
            product_name:
              item.product_name || "Ürün",
            image_url:
              item.image_url || null,
          }));

        setOrder({
          id: Number(orderData.id),
          customer_name:
            orderData.customer_name,
          table_number:
            String(orderData.table_number),
          note: orderData.note,
          total_amount:
            Number(orderData.total_amount),
          status: orderData.status,
          created_at:
            orderData.created_at,
        });

        setOrderItems(formattedItems);
        setError("");
        setLoading(false);
      } catch (error) {
        console.error(
          "Sipariş yüklenirken beklenmeyen hata:",
          error
        );

        if (mounted) {
          setError(
            "Sipariş bilgileri yüklenirken bir hata oluştu."
          );
          setLoading(false);
        }
      }
    }

    loadOrder();

    // =====================================================
    // SİPARİŞ DURUMUNU GÜNCELLE
    // RPC ÜZERİNDEN 2 SANİYEDE BİR KONTROL
    // =====================================================

    const pollingInterval = window.setInterval(async () => {
      if (!mounted || !tableToken) return;

      try {
        const {
          data,
          error,
        } = await supabase.rpc(
          "get_public_order",
          {
            p_order_id: orderId,
            p_table_token: tableToken,
          }
        );

        if (
          error ||
          !data ||
          !data.order ||
          !mounted
        ) {
          return;
        }

        const orderData = data.order;

        setOrder((currentOrder) => {
          if (
            currentOrder &&
            currentOrder.status ===
              orderData.status
          ) {
            return currentOrder;
          }

          console.log(
            "🔄 Sipariş durumu RPC ile güncellendi:",
            orderData.status
          );

          return {
            id: Number(orderData.id),
            customer_name:
              orderData.customer_name,
            table_number:
              String(orderData.table_number),
            note: orderData.note,
            total_amount:
              Number(orderData.total_amount),
            status: orderData.status,
            created_at:
              orderData.created_at,
          };
        });

        if (
          Array.isArray(data.items)
        ) {
          const updatedItems: OrderItem[] =
            data.items.map(
              (item: any) => ({
                id: Number(item.id),
                product_id:
                  Number(item.product_id),
                quantity:
                  Number(item.quantity),
                unit_price:
                  Number(item.unit_price),
                total_price:
                  Number(item.total_price),
                product_name:
                  item.product_name ||
                  "Ürün",
                image_url:
                  item.image_url ||
                  null,
              })
            );

          setOrderItems(updatedItems);
        }
      } catch (error) {
        console.warn(
          "Sipariş polling hatası:",
          error
        );
      }
    }, 2000);

    return () => {
      mounted = false;
      window.clearInterval(pollingInterval);
    };
  }, [orderId, tableToken]);

  // =====================================================
  // DEĞERLENDİRME GÖNDER
  // =====================================================

  async function submitReview() {
  if (!order) {
    setReviewError(
      "Sipariş bilgileri yüklenemedi."
    );
    return;
  }

  if (rating < 1 || rating > 5) {
    setReviewError(
      "Lütfen 1 ile 5 arasında bir puan seçin."
    );
    return;
  }

  setReviewLoading(true);
  setReviewError("");

  try {
    const supabase = createClient();

    // -------------------------------------------------
    // RESTORANI BUL
    // -------------------------------------------------

    const {
      data: restaurant,
      error: restaurantError,
    } = await supabase
      .from("restaurants")
      .select("id")
      .eq("slug", slug)
      .single();

    if (restaurantError || !restaurant) {
      setReviewError(
        "İşletme bulunamadı."
      );

      setReviewLoading(false);
      return;
    }

    // -------------------------------------------------
    // DEĞERLENDİRMEYİ RPC İLE GÖNDER
    // -------------------------------------------------

    const {
      data: reviewId,
      error: reviewError,
    } = await supabase.rpc(
      "create_public_review",
      {
        p_order_id: order.id,
        p_restaurant_id: restaurant.id,
        p_rating: rating,
        p_comment:
          reviewComment.trim() || null,
      }
    );

    // -------------------------------------------------
    // RPC HATASI
    // -------------------------------------------------

    if (
      reviewError ||
      !reviewId
    ) {
      console.error(
        "Değerlendirme RPC hatası:",
        reviewError
      );

      const errorMessage =
        reviewError?.message || "";

      // Duplicate değerlendirme
      if (
        errorMessage.includes(
          "zaten bir değerlendirme yapılmış"
        )
      ) {
        setReviewError(
          "Bu sipariş için zaten bir değerlendirme yapılmış."
        );
      }

      // Sipariş delivered değil
      else if (
        errorMessage.includes(
          "değerlendirme için uygun değil"
        )
      ) {
        setReviewError(
          "Bu sipariş henüz değerlendirmeye uygun değil."
        );
      }

      // Genel hata
      else {
        setReviewError(
          "Değerlendirme gönderilemedi: " +
            (
              errorMessage ||
              "Bilinmeyen hata"
            )
        );
      }

      setReviewLoading(false);
      return;
    }

    // -------------------------------------------------
    // BAŞARILI
    // -------------------------------------------------

    console.log(
      "Değerlendirme başarıyla oluşturuldu:",
      reviewId
    );

    setReviewSubmitted(true);
    setReviewLoading(false);

  } catch (error) {
    console.error(
      "Değerlendirme gönderme hatası:",
      error
    );

    setReviewError(
      error instanceof Error
        ? `Değerlendirme gönderilemedi: ${error.message}`
        : "Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin."
    );

    setReviewLoading(false);
  }
}
  // =====================================================
  // YÜKLENİYOR
  // =====================================================

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

  // =====================================================
  // HATA
  // =====================================================

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

  // =====================================================
  // AKTİF ADIMI BUL
  // =====================================================

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

  // =====================================================
  // TARİH
  // =====================================================

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

  // =====================================================
  // İLERLEME YÜZDESİ
  // =====================================================

  const progressPercentage =
    (activeIndex /
      (statusSteps.length - 1)) *
    100;

  return (
    <main className="restaurant-page">

      {/* =================================================
          ÜST BAŞLIK
      ================================================= */}

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

      {/* =================================================
          MEVCUT DURUM
      ================================================= */}

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

      {/* =================================================
          İLERLEME ÇUBUĞU
      ================================================= */}

      <section
        style={{
          background: "#fff",
          borderRadius: "18px",
          padding: "18px",
          marginTop: "14px",
          border: "1px solid #e8e3da",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "center",
            marginBottom: "9px",
          }}
        >
          <span
            style={{
              fontSize: "11px",
              fontWeight: 800,
              color: "#777",
            }}
          >
            SİPARİŞ İLERLEMESİ
          </span>

          <strong
            style={{
              fontSize: "11px",
              color: "#b8860b",
            }}
          >
            {Math.round(
              progressPercentage
            )}
            %
          </strong>
        </div>

        <div
          style={{
            width: "100%",
            height: "7px",
            borderRadius: "999px",
            background: "#eeeae2",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${progressPercentage}%`,
              height: "100%",
              borderRadius: "999px",
              background: "#b8860b",
              transition:
                "width 0.5s ease",
            }}
          />
        </div>
      </section>

      {/* =================================================
          SİPARİŞ DURUM ADIMLARI
      ================================================= */}

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

      {/* =================================================
          SİPARİŞ İÇERİĞİ
      ================================================= */}

      <section className="tracking-info-card">

        <div className="tracking-info-header">

          <span>
            SİPARİŞ İÇERİĞİ
          </span>

          <h2>
            Siparişiniz
          </h2>

        </div>

        {orderItems.length === 0 ? (

          <div
            style={{
              padding: "20px 0",
              textAlign: "center",
              color: "#999",
              fontSize: "13px",
            }}
          >
            Sipariş ürünleri yükleniyor...
          </div>

        ) : (

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >

            {orderItems.map(
              (item) => (

                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding:
                      "10px 0",
                    borderBottom:
                      "1px solid #eeeae4",
                  }}
                >

                  {/* FOTOĞRAF */}

                  {item.image_url ? (

                    <img
                      src={item.image_url}
                      alt={item.product_name}
                      style={{
                        width: "58px",
                        height: "58px",
                        objectFit:
                          "cover",
                        borderRadius:
                          "12px",
                        flexShrink: 0,
                      }}
                    />

                  ) : (

                    <div
                      style={{
                        width: "58px",
                        height: "58px",
                        borderRadius:
                          "12px",
                        background:
                          "#f5f1e9",
                        display: "flex",
                        alignItems:
                          "center",
                        justifyContent:
                          "center",
                        fontSize: "24px",
                        flexShrink: 0,
                      }}
                    >
                      🍽️
                    </div>

                  )}

                  {/* ÜRÜN */}

                  <div
                    style={{
                      flex: 1,
                      minWidth: 0,
                    }}
                  >

                    <strong
                      style={{
                        display: "block",
                        fontSize: "14px",
                        color: "#222",
                      }}
                    >
                      {item.product_name}
                    </strong>

                    <span
                      style={{
                        display: "block",
                        marginTop:
                          "4px",
                        fontSize: "11px",
                        color: "#999",
                      }}
                    >
                      {item.quantity} adet ×{" "}
                      {item.unit_price.toLocaleString(
                        "tr-TR"
                      )}{" "}
                      TL
                    </span>

                  </div>

                  {/* TOPLAM */}

                  <strong
                    style={{
                      flexShrink: 0,
                      fontSize: "14px",
                      color: "#111",
                    }}
                  >
                    {item.total_price.toLocaleString(
                      "tr-TR"
                    )}{" "}
                    TL
                  </strong>

                </div>

              )
            )}

          </div>

        )}

        {/* TOPLAM */}

        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "center",
            marginTop: "18px",
            paddingTop: "16px",
            borderTop:
              "2px solid #e8e2d8",
          }}
        >

          <span
            style={{
              fontSize: "14px",
              fontWeight: 700,
              color: "#666",
            }}
          >
            Genel Toplam
          </span>

          <strong
            style={{
              fontSize: "22px",
              fontWeight: 950,
              color: "#111",
            }}
          >
            {Number(
              order.total_amount
            ).toLocaleString(
              "tr-TR"
            )}{" "}
            TL
          </strong>

        </div>

      </section>

      {/* =================================================
          SİPARİŞ BİLGİLERİ
      ================================================= */}

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

      {/* =================================================
          DEĞERLENDİRME
      ================================================= */}

      {order.status ===
        "delivered" && (

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

                {[1, 2, 3, 4, 5].map(
                  (star) => (

                    <button
                      key={star}
                      type="button"
                      onClick={() =>
                        setRating(star)
                      }
                      aria-label={`${star} yıldız`}
                      className={
                        star <= rating
                          ? "review-star active"
                          : "review-star"
                      }
                    >
                      ★
                    </button>

                  )
                )}

              </div>

              {rating > 0 && (
                <div className="review-rating-text">

                  {rating === 1 &&
                    "Çok kötü"}

                  {rating === 2 &&
                    "Kötü"}

                  {rating === 3 &&
                    "Ortalama"}

                  {rating === 4 &&
                    "Çok iyi"}

                  {rating === 5 &&
                    "Mükemmel! ❤️"}

                </div>
              )}

              {/* YORUM */}

              <textarea
                value={reviewComment}
                onChange={(event) =>
                  setReviewComment(
                    event.target.value
                  )
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
                  reviewLoading ||
                  rating === 0
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

      {/* =================================================
          ALT BİLGİ
      ================================================= */}

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