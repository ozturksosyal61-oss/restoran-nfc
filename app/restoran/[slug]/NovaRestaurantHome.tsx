
type NovaRestaurantHomeProps = {
  restaurant: {
    id: number;
    name: string;
    slug: string;
    description?: string | null;
    instagram_url?: string | null;
    google_review_url?: string | null;
    logo_url?: string | null;
    cover_image_url?: string | null;
    theme?: string | null;
  };
  table: {
    id: number;
    table_number: number;
    public_token: string;
  } | null;
  tableQuery: string;
  reviews: Array<{
    id: number;
    customer_name: string | null;
    rating: number;
    comment: string | null;
    created_at: string;
  }>;
  averageRating: string;
  ratingCounts: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
  garsonStatus?: string;
  hesapStatus?: string;
  callWaiter: (formData: FormData) => Promise<void>;
  requestBill: (formData: FormData) => Promise<void>;
};

export default function NovaRestaurantHome({
  restaurant,
  table,
  tableQuery,
  reviews,
  averageRating,
  ratingCounts,
  garsonStatus = "",
  hesapStatus = "",
  callWaiter,
  requestBill,
}: NovaRestaurantHomeProps) {
  const totalReviews = reviews.length;

  const ratingRows = [5, 4, 3, 2, 1].map((star) => {
    const count = ratingCounts[star as keyof typeof ratingCounts] || 0;
    const percentage = totalReviews ? Math.round((count / totalReviews) * 100) : 0;
    return { star, count, percentage };
  });

  return (
    <main className="nova-reference-home">
      <style>{`
        .nova-reference-home {
          --nova-bg: #050709;
          --nova-card: #111519;
          --nova-card-2: #151a1d;
          --nova-line: rgba(255,255,255,.11);
          --nova-text: #f7f5ef;
          --nova-muted: #98a09c;
          --nova-gold: #d7b772;
          --nova-green: #c9ff4d;
          --nova-green-2: #9fc72d;
          min-height: 100vh;
          padding: 0 8px 26px;
          background:
            radial-gradient(circle at 12% 4%, rgba(190,255,70,.055), transparent 22%),
            radial-gradient(circle at 92% 6%, rgba(216,176,93,.07), transparent 24%),
            linear-gradient(180deg,#050709 0%,#07090b 100%);
          color: var(--nova-text);
          box-sizing: border-box;
        }

        .nova-reference-shell {
          width: min(100%, 430px);
          margin: 0 auto;
        }

        .nova-reference-hero {
          position: relative;
          min-height: 642px;
          overflow: hidden;
          border-radius: 0 0 26px 26px;
          border: 1px solid rgba(255,255,255,.08);
          background:
            linear-gradient(180deg, rgba(0,0,0,.04) 14%, rgba(0,0,0,.32) 42%, rgba(0,0,0,.96) 92%),
            ${restaurant.cover_image_url
              ? `url("${restaurant.cover_image_url}")`
              : "linear-gradient(145deg,#111517,#060708)"};
          background-position: center;
          background-size: cover;
          box-shadow: 0 26px 65px rgba(0,0,0,.34);
        }

        .nova-reference-topbar {
          position: absolute;
          left: 14px;
          right: 14px;
          top: 12px;
          z-index: 2;
          display: flex;
          justify-content: flex-end;
        }

        .nova-reference-lang {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          min-height: 34px;
          padding: 0 11px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,.13);
          background: rgba(13,16,18,.54);
          color: #ece9e1;
          backdrop-filter: blur(10px);
          font-size: 9px;
          font-weight: 900;
        }

        .nova-reference-hero-content {
          position: absolute;
          inset: auto 16px 17px;
          z-index: 2;
        }

        .nova-reference-brand-block {
          display: grid;
          justify-items: center;
          text-align: center;
        }

        .nova-reference-logo {
          width: 104px;
          height: 104px;
          border-radius: 30px;
          overflow: hidden;
          display: grid;
          place-items: center;
          background: rgba(3,5,6,.70);
          border: 1px solid rgba(221,190,121,.45);
          box-shadow:
            0 0 0 8px rgba(205,169,90,.035),
            0 16px 34px rgba(0,0,0,.30);
        }

        .nova-reference-logo img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          padding: 8px;
        }

        .nova-reference-logo span {
          color: var(--nova-gold);
          font-size: 26px;
          font-weight: 950;
          letter-spacing: 2px;
        }

        .nova-reference-kicker {
          margin-top: 16px;
          color: #f2efe8;
          font-size: 16px;
          font-weight: 900;
          letter-spacing: 1px;
        }

        .nova-reference-description {
          max-width: 285px;
          margin: 13px auto 0;
          color: #f1eee7;
          font-size: 17px;
          line-height: 1.38;
          text-shadow: 0 2px 15px rgba(0,0,0,.38);
        }

        .nova-reference-discover {
          margin-top: 36px;
          padding: 13px 14px;
          display: grid;
          grid-template-columns: 40px minmax(0,1fr) 34px;
          align-items: center;
          gap: 11px;
          border-radius: 20px;
          border: 1px solid rgba(255,255,255,.08);
          background: rgba(21,24,25,.84);
          box-shadow: 0 18px 40px rgba(0,0,0,.28);
          text-decoration: none;
          color: inherit;
          backdrop-filter: blur(14px);
        }

        .nova-reference-discover-icon,
        .nova-reference-discover-arrow {
          display: grid;
          place-items: center;
          border-radius: 13px;
          background: rgba(255,255,255,.07);
          color: #d8cfbb;
        }

        .nova-reference-discover-icon {
          width: 40px;
          height: 40px;
          font-size: 18px;
        }

        .nova-reference-discover-arrow {
          width: 34px;
          height: 34px;
          font-size: 20px;
        }

        .nova-reference-discover strong {
          display: block;
          font-size: 13px;
          font-weight: 950;
        }

        .nova-reference-discover small {
          display: block;
          margin-top: 3px;
          color: #9da29d;
          font-size: 8px;
        }

        .nova-reference-meta {
          margin-top: 12px;
          display: grid;
          grid-template-columns: repeat(3,minmax(0,1fr));
          gap: 7px;
        }

        .nova-reference-meta-chip {
          min-height: 38px;
          padding: 0 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          border-radius: 13px;
          background: rgba(15,18,20,.78);
          border: 1px solid rgba(255,255,255,.07);
          color: #dedbd2;
          font-size: 8px;
          font-weight: 900;
          white-space: nowrap;
        }

        .nova-reference-meta-chip.open { color: #eaffb5; }
        .nova-reference-star { color: #ffd24a; }

        .nova-reference-footer-line {
          width: 35px;
          height: 2px;
          margin: 30px auto 0;
          border-radius: 99px;
          background: var(--nova-gold);
        }

        .nova-reference-micro {
          margin-top: 14px;
          color: #8c938f;
          text-align: center;
          font-size: 8px;
          line-height: 1.4;
        }

        .nova-reference-more {
          margin-top: 10px;
          border-radius: 20px;
          border: 1px solid rgba(255,255,255,.08);
          background: #0d1113;
          overflow: hidden;
        }

        .nova-reference-more summary {
          list-style: none;
          padding: 13px 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: pointer;
          color: #d6d2ca;
          font-size: 9px;
          font-weight: 900;
        }

        .nova-reference-more summary::-webkit-details-marker { display: none; }

        .nova-reference-more-grid {
          padding: 0 10px 10px;
          display: grid;
          grid-template-columns: repeat(2,minmax(0,1fr));
          gap: 8px;
        }

        .nova-reference-more-card {
          min-height: 65px;
          padding: 10px;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,.06);
          background: #151a1d;
          color: #f1eee8;
          text-decoration: none;
          display: grid;
          grid-template-columns: 34px 1fr;
          align-items: center;
          gap: 8px;
        }

        .nova-reference-more-card > span {
          width: 34px;
          height: 34px;
          display: grid;
          place-items: center;
          border-radius: 11px;
          background: #20272a;
          font-size: 16px;
        }

        .nova-reference-more-card strong {
          display: block;
          font-size: 9px;
          line-height: 1.05;
        }

        .nova-reference-more-card small {
          display: block;
          margin-top: 3px;
          color: #929a96;
          font-size: 7px;
          line-height: 1.25;
        }

        .nova-reference-review {
          margin-top: 10px;
          padding: 16px;
          border-radius: 21px;
          border: 1px solid rgba(255,255,255,.08);
          background: linear-gradient(145deg,#14181b,#0f1315);
        }

        .nova-reference-review-head {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          align-items: end;
        }

        .nova-reference-review-kicker {
          color: #b9e342;
          font-size: 7px;
          letter-spacing: 2px;
          font-weight: 950;
        }

        .nova-reference-review-head h2 {
          margin: 4px 0 0;
          font-size: 23px;
          line-height: 1;
        }

        .nova-reference-badge {
          padding: 7px 9px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,.09);
          background: #171c1f;
          color: #d8d4cb;
          font-size: 7px;
          font-weight: 900;
          white-space: nowrap;
        }

        .nova-reference-rating {
          margin-top: 12px;
          display: grid;
          grid-template-columns: 95px 1fr;
          gap: 12px;
          align-items: center;
        }

        .nova-reference-score {
          padding-right: 11px;
          border-right: 1px solid rgba(255,255,255,.08);
          text-align: center;
        }

        .nova-reference-score strong {
          display: block;
          font-size: 39px;
          line-height: .92;
        }

        .nova-reference-score .stars {
          margin-top: 5px;
          color: #d7ff63;
          font-size: 11px;
          letter-spacing: 1px;
        }

        .nova-reference-score small {
          display: block;
          margin-top: 4px;
          color: #818985;
          font-size: 7px;
        }

        .nova-reference-bars { display: grid; gap: 5px; }
        .nova-reference-bar {
          display: grid;
          grid-template-columns: 18px 1fr 17px;
          gap: 5px;
          align-items: center;
          color: #858d89;
          font-size: 7px;
          font-weight: 900;
        }

        .nova-reference-bar-bg {
          height: 5px;
          border-radius: 99px;
          overflow: hidden;
          background: #23282b;
        }

        .nova-reference-bar-fill {
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg,#8fac30,#d9ff61);
        }

        .nova-reference-reviews {
          margin-top: 9px;
          display: grid;
          gap: 8px;
        }

        .nova-reference-review-card {
          padding: 12px;
          border-radius: 17px;
          border: 1px solid rgba(255,255,255,.07);
          background: #111518;
        }

        .nova-reference-review-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 7px;
          font-size: 8px;
          font-weight: 900;
        }

        .nova-reference-review-date {
          color: #6d7772;
          font-size: 7px;
        }

        .nova-reference-review-card .stars {
          margin-top: 6px;
          color: #d7ff63;
          font-size: 10px;
          letter-spacing: 1px;
        }

        .nova-reference-review-card p {
          margin: 6px 0 0;
          color: #929a96;
          font-size: 8px;
          line-height: 1.4;
        }

        .nova-reference-brand-footer {
          padding: 17px 0 5px;
          text-align: center;
          color: #6d7571;
          font-size: 7px;
          font-weight: 900;
          letter-spacing: 1.3px;
        }

        @media (max-width: 380px) {
          .nova-reference-hero,
          .nova-reference-hero-content { min-height: 625px; }
          .nova-reference-hero-content { inset: auto 13px 14px; }
          .nova-reference-kicker { font-size: 14px; }
          .nova-reference-description { font-size: 15px; }
        }
      `}</style>

      <div className="nova-reference-shell">
        <section className="nova-reference-hero">
          <div className="nova-reference-topbar">
            <span className="nova-reference-lang">TR 🌐</span>
          </div>

          <div className="nova-reference-hero-content">
            <div className="nova-reference-brand-block">
              <div className="nova-reference-logo">
                {restaurant.logo_url ? (
                  <img src={restaurant.logo_url} alt={`${restaurant.name} logosu`} />
                ) : (
                  <span>{restaurant.name.slice(0, 1).toUpperCase()}</span>
                )}
              </div>

              <div className="nova-reference-kicker">{restaurant.name}</div>

              <p className="nova-reference-description">
                {restaurant.description || "Modern mutfak, gerçek lezzet deneyimi."}
              </p>
            </div>

            <a
              className="nova-reference-discover"
              href={`/restoran/${restaurant.slug}/menu${tableQuery}`}
              aria-label="Menüyü keşfet"
            >
              <span className="nova-reference-discover-icon">◫</span>
              <span>
                <strong>Menüyü Keşfet</strong>
                <small>Lezzet dolu bir yolculuk.</small>
              </span>
              <span className="nova-reference-discover-arrow">→</span>
            </a>

            <div className="nova-reference-meta">
              <span className="nova-reference-meta-chip">
                🪑 Masa {table?.table_number ?? "—"}
              </span>
              <span className="nova-reference-meta-chip open">
                🟢 Açık
              </span>
              <span className="nova-reference-meta-chip">
                <span className="nova-reference-star">★</span>
                {averageRating} ({totalReviews})
              </span>
            </div>

            <div className="nova-reference-footer-line" />
            <div className="nova-reference-micro">
              İyi yemek, iyi insanlar, her zaman.
            </div>
          </div>
        </section>

        <details className="nova-reference-more">
          <summary>
            <span>Diğer işlemler</span>
            <span>＋</span>
          </summary>

          <div className="nova-reference-more-grid">
            {restaurant.google_review_url ? (
              <a
                className="nova-reference-more-card"
                href={restaurant.google_review_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span>★</span>
                <span>
                  <strong>Bizi Değerlendirin</strong>
                  <small>Deneyiminizi paylaşın</small>
                </span>
              </a>
            ) : null}

            {table ? (
              <form action={callWaiter} className="nova-reference-more-card">
                <input type="hidden" name="slug" value={restaurant.slug} />
                <input type="hidden" name="masa" value={table.public_token} />
                <button
                  type="submit"
                  style={{
                    gridColumn: "1 / -1",
                    border: 0,
                    background: "transparent",
                    color: "inherit",
                    width: "100%",
                    padding: 0,
                    display: "grid",
                    gridTemplateColumns: "34px 1fr",
                    alignItems: "center",
                    gap: "8px",
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  <span>🛎️</span>
                  <span>
                    <strong>{garsonStatus === "ok" ? "Garson Çağrıldı" : "Garsonu Çağır"}</strong>
                    <small>{garsonStatus === "ok" ? "Talep iletildi" : "Masanıza garson yönlendirin"}</small>
                  </span>
                </button>
              </form>
            ) : null}

            {table ? (
              <form action={requestBill} className="nova-reference-more-card">
                <input type="hidden" name="slug" value={restaurant.slug} />
                <input type="hidden" name="masa" value={table.public_token} />
                <button
                  type="submit"
                  style={{
                    gridColumn: "1 / -1",
                    border: 0,
                    background: "transparent",
                    color: "inherit",
                    width: "100%",
                    padding: 0,
                    display: "grid",
                    gridTemplateColumns: "34px 1fr",
                    alignItems: "center",
                    gap: "8px",
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  <span>🧾</span>
                  <span>
                    <strong>{hesapStatus === "ok" ? "Hesap İstendi" : "Hesap İste"}</strong>
                    <small>{hesapStatus === "ok" ? "Talep iletildi" : "Hesabınızı masanıza getirelim"}</small>
                  </span>
                </button>
              </form>
            ) : null}

            {restaurant.instagram_url ? (
              <a
                className="nova-reference-more-card"
                href={restaurant.instagram_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span>◎</span>
                <span>
                  <strong>Instagram</strong>
                  <small>Bizi takip edin</small>
                </span>
              </a>
            ) : null}

            <a
              className="nova-reference-more-card"
              href={`/restoran/${restaurant.slug}/calisan${tableQuery}`}
            >
              <span>💬</span>
              <span>
                <strong>Çalışanı Değerlendir</strong>
                <small>Hizmet deneyiminizi paylaşın</small>
              </span>
            </a>

            <a
              className="nova-reference-more-card"
              href={`/restoran/${restaurant.slug}/odeme${tableQuery}`}
            >
              <span>💳</span>
              <span>
                <strong>Ödeme Yap</strong>
                <small>Hesabınızı tamamlayın</small>
              </span>
            </a>
          </div>
        </details>

        <section className="nova-reference-review">
          <div className="nova-reference-review-head">
            <div>
              <span className="nova-reference-review-kicker">MÜŞTERİ DENEYİMİ</span>
              <h2>Müşterilerimiz Ne Diyor?</h2>
            </div>
            <span className="nova-reference-badge">💛 Gerçek deneyimler</span>
          </div>

          <div className="nova-reference-rating">
            <div className="nova-reference-score">
              <strong>{averageRating}</strong>
              <div className="stars">
                {"★".repeat(Math.round(Number(averageRating) || 0))}
              </div>
              <small>{totalReviews} değerlendirme</small>
            </div>

            <div className="nova-reference-bars">
              {ratingRows.map((row) => (
                <div className="nova-reference-bar" key={row.star}>
                  <span>{row.star}★</span>
                  <div className="nova-reference-bar-bg">
                    <div
                      className="nova-reference-bar-fill"
                      style={{ width: `${row.percentage}%` }}
                    />
                  </div>
                  <span style={{ textAlign: "right" }}>{row.count}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="nova-reference-reviews">
          {reviews.slice(0, 3).map((review) => (
            <article className="nova-reference-review-card" key={review.id}>
              <div className="nova-reference-review-row">
                <span>👤 {review.customer_name || "Misafir"}</span>
                <span className="nova-reference-review-date">
                  {new Date(review.created_at).toLocaleDateString("tr-TR")}
                </span>
              </div>
              <div className="stars">
                {"★".repeat(Number(review.rating))}
              </div>
              {review.comment ? <p>“{review.comment}”</p> : null}
            </article>
          ))}
        </section>

        <div className="nova-reference-brand-footer">
          OZT DIGITAL · DİJİTAL RESTORAN DENEYİMİ
        </div>
      </div>
    </main>
  );
}
