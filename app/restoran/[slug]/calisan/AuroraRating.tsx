"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import AuroraIcon from "../AuroraIcon";
import styles from "../AuroraFlow.module.css";

// Çalışan değerlendirme — Aurora görünümü. Kayıt mantığı calisan/page.tsx
// içinde kalır (yorum, işletme onaylayana kadar gizli eklenir).

type Employee = { id: number; name: string; role: string | null };

const RATING_LABELS = ["", "Çok kötü", "Kötü", "Ortalama", "Çok iyi", "Mükemmel"];

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toLocaleUpperCase("tr-TR"))
    .join("");
}

export default function AuroraRating({
  slug,
  restaurant,
  employees,
  loading,
  error,
  success,
  selectedEmployee,
  onSelectEmployee,
  rating,
  onRatingChange,
  comment,
  onCommentChange,
  onSubmit,
  onResetSuccess,
}: {
  slug: string;
  restaurant: { name: string; logo_url: string | null } | null;
  employees: Employee[];
  loading: boolean;
  error: string;
  success: boolean;
  selectedEmployee: string;
  onSelectEmployee: (id: string) => void;
  rating: number;
  onRatingChange: (value: number) => void;
  comment: string;
  onCommentChange: (value: string) => void;
  onSubmit: () => Promise<void>;
  onResetSuccess: () => void;
}) {
  const [sending, setSending] = useState(false);
  const masa = useSearchParams().get("masa")?.trim() || "";
  const homeHref = `/restoran/${encodeURIComponent(slug)}${masa ? `?masa=${encodeURIComponent(masa)}` : ""}`;

  async function submit() {
    if (sending) return;
    setSending(true);
    await onSubmit();
    setSending(false);
  }

  const header = (
    <header className={styles.top}>
      <a className={styles.round} href={homeHref} aria-label="Ana sayfaya dön">
        <AuroraIcon name="back" />
      </a>
      <h1>Bizi değerlendirin</h1>
    </header>
  );

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.column}>
          {header}
          <div className={styles.state} role="status">
            <span className={styles.spinner} aria-hidden="true" />
            <strong>Yükleniyor</strong>
          </div>
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className={styles.page}>
        <div className={styles.column}>
          {header}
          <div className={styles.state} role="alert">
            <span className={`${styles.stateIcon} ${styles.stateIconDanger}`}>
              <AuroraIcon name="alert" size={24} />
            </span>
            <strong>Sayfa açılamadı</strong>
            <span>{error || "İşletme bulunamadı."}</span>
          </div>
        </div>
      </div>
    );
  }

  const selectedName = employees.find((employee) => String(employee.id) === selectedEmployee)?.name;

  return (
    <div className={styles.page}>
      <div className={styles.column}>
        {header}

        <div className={styles.intro}>
          <span className={styles.introLogo}>
            {restaurant.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={restaurant.logo_url} alt="" />
            ) : (
              restaurant.name.trim().charAt(0).toLocaleUpperCase("tr-TR")
            )}
          </span>
          <span>
            <strong>{restaurant.name}</strong>
            <p>Size hizmet veren çalışanı seçip puan verin. Görüşünüz işletmeye iletilir.</p>
          </span>
        </div>

        {success ? (
          <section className={styles.block}>
            <div className={styles.reviewDone} role="status">
              <span className={styles.stateIcon}>
                <AuroraIcon name="star" size={22} />
              </span>
              <strong>Teşekkür ederiz</strong>
              <span>Değerlendirmeniz işletmeye iletildi.</span>
            </div>
            <button type="button" className={styles.ghost} onClick={onResetSuccess}>
              Başka bir çalışanı değerlendir
            </button>
            <a className={styles.ghost} href={homeHref}>
              Ana sayfaya dön
            </a>
          </section>
        ) : (
          <>
            <section className={styles.block} aria-labelledby="calisan-baslik">
              <span id="calisan-baslik" className={styles.kicker}>
                Kimi değerlendiriyorsunuz?
              </span>

              {employees.length === 0 ? (
                <p className={styles.muted}>Şu anda değerlendirilebilecek aktif çalışan bulunmuyor.</p>
              ) : (
                <div className={styles.people} role="radiogroup" aria-labelledby="calisan-baslik">
                  {employees.map((employee) => {
                    const on = String(employee.id) === selectedEmployee;
                    return (
                      <button
                        key={employee.id}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        className={on ? `${styles.person} ${styles.personOn}` : styles.person}
                        onClick={() => onSelectEmployee(String(employee.id))}
                      >
                        <span className={styles.avatar}>{initials(employee.name)}</span>
                        <span className={styles.personText}>
                          <strong>{employee.name}</strong>
                          {employee.role && <small>{employee.role}</small>}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            {employees.length > 0 && (
              <section className={styles.block} aria-labelledby="puan-baslik">
                <div>
                  <span className={styles.kicker}>Puanınız</span>
                  <h2 id="puan-baslik" className={styles.blockTitle}>
                    {selectedName ? `${selectedName} nasıldı?` : "Hizmeti nasıl buldunuz?"}
                  </h2>
                </div>

                <div className={styles.stars} role="radiogroup" aria-label="Puan">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      role="radio"
                      aria-checked={rating === star}
                      aria-label={`${star} yıldız`}
                      className={star <= rating ? styles.starOn : styles.star}
                      onClick={() => onRatingChange(star)}
                    >
                      <AuroraIcon name="star" size={28} strokeWidth={1.6} />
                    </button>
                  ))}
                  {rating > 0 && <span className={styles.ratingLabel}>{RATING_LABELS[rating]}</span>}
                </div>

                <div className={styles.field}>
                  <label htmlFor="calisan-yorum">
                    Yorumunuz <em>· isteğe bağlı</em>
                  </label>
                  <textarea
                    id="calisan-yorum"
                    value={comment}
                    onChange={(event) => onCommentChange(event.target.value)}
                    placeholder="Güler yüz, hız, ilgi…"
                    rows={3}
                    maxLength={1000}
                  />
                </div>

                {error && (
                  <p className={styles.error} role="alert">
                    <AuroraIcon name="alert" size={16} />
                    {error}
                  </p>
                )}

                <button
                  type="button"
                  className={styles.cta}
                  onClick={submit}
                  disabled={sending || !selectedEmployee || rating === 0}
                >
                  {sending ? "Gönderiliyor…" : "Değerlendirmeyi gönder"}
                </button>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
