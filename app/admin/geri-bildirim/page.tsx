import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminRestaurant } from "../../../lib/admin-restaurant";
import AdminIcon from "../AdminIcon";
import { setFeedbackResolved } from "./actions";

type Feedback = {
  id: number;
  rating: number;
  comment: string | null;
  contact: string | null;
  went_to_google: boolean;
  is_resolved: boolean;
  created_at: string;
};

type Filter = "tumu" | "sikayet" | "memnun" | "bekleyen";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "tumu", label: "Tümü" },
  { value: "bekleyen", label: "Yanıt bekleyen" },
  { value: "sikayet", label: "Şikâyetler (1-3★)" },
  { value: "memnun", label: "Memnun (4-5★)" },
];

function matches(item: Feedback, filter: Filter) {
  if (filter === "sikayet") return item.rating <= 3;
  if (filter === "memnun") return item.rating >= 4;
  if (filter === "bekleyen") return item.rating <= 3 && !item.is_resolved;
  return true;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("tr-TR", {
    timeZone: "Europe/Istanbul",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function FeedbackAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ durum?: string }>;
}) {
  const admin = await getAdminRestaurant();
  if (!admin) redirect("/admin/login");

  const { durum } = await searchParams;
  const filter: Filter = FILTERS.some((item) => item.value === durum) ? (durum as Filter) : "tumu";

  const [{ data, error }, { data: restaurant }] = await Promise.all([
    admin.supabase
      .from("customer_feedback")
      .select("id, rating, comment, contact, went_to_google, is_resolved, created_at")
      .eq("restaurant_id", admin.restaurantId)
      .order("created_at", { ascending: false })
      .limit(500),
    admin.supabase.from("restaurants").select("slug, google_review_url").eq("id", admin.restaurantId).maybeSingle(),
  ]);

  const tableMissing = Boolean(error);
  const list = (data ?? []) as Feedback[];
  const shown = list.filter((item) => matches(item, filter));

  const average = list.length > 0 ? list.reduce((sum, item) => sum + item.rating, 0) / list.length : 0;
  const toGoogle = list.filter((item) => item.went_to_google).length;
  const waiting = list.filter((item) => matches(item, "bekleyen")).length;
  const counts = Object.fromEntries(FILTERS.map((item) => [item.value, list.filter((f) => matches(f, item.value)).length]));

  const pageUrl = restaurant?.slug ? `/restoran/${restaurant.slug}/degerlendir` : null;

  return (
    <main className="adm-page">
      <header className="adm-head">
        <div className="adm-head-text">
          <span className="adm-eyebrow">Müşteri geri bildirimi</span>
          <h1>Geri bildirimler</h1>
          <p>
            Misafirler deneyimini puanlar. 4-5 yıldız verenler Google yorumuna davet edilir; düşük puan verenlerin
            mesajı önce size gelir, böylece sorunu Google&apos;a yansımadan çözebilirsiniz.
          </p>
        </div>
        {pageUrl && (
          <div className="adm-head-actions">
            <Link className="adm-btn" href={pageUrl} target="_blank">
              <AdminIcon name="external" size={16} />
              Sayfayı gör
            </Link>
          </div>
        )}
      </header>

      {tableMissing && (
        <p className="adm-alert adm-alert-error" role="alert">
          <AdminIcon name="alert" size={16} />
          Bu özellik için veritabanı güncellemesi bekleniyor. Lütfen OZT Digital ile iletişime geçin.
        </p>
      )}

      {!restaurant?.google_review_url && (
        <p className="adm-alert adm-alert-info">
          <AdminIcon name="info" size={16} />
          Google yorum bağlantınız eklenmemiş; memnun misafirler şu an Google&apos;a yönlendirilmiyor.{" "}
          <Link href="/admin/ayarlar">İşletme ayarlarından ekleyin.</Link>
        </p>
      )}

      <section className="adm-stats" aria-label="Geri bildirim özeti">
        <div className="adm-stat">
          <div className="adm-stat-top">
            <span className="adm-stat-label">Ortalama puan</span>
            <span className="adm-stat-icon"><AdminIcon name="star" size={16} /></span>
          </div>
          <span className="adm-stat-value">{list.length > 0 ? average.toFixed(1) : "—"}</span>
          <span className="adm-stat-hint">{list.length} geri bildirim</span>
        </div>
        <div className="adm-stat tone-ok">
          <div className="adm-stat-top">
            <span className="adm-stat-label">Google&apos;a yönlenen</span>
            <span className="adm-stat-icon"><AdminIcon name="external" size={16} /></span>
          </div>
          <span className="adm-stat-value">{toGoogle}</span>
          <span className="adm-stat-hint">Yorum yazmak için Google&apos;ı açan misafir</span>
        </div>
        <div className={`adm-stat ${waiting > 0 ? "tone-new" : "tone-done"}`}>
          <div className="adm-stat-top">
            <span className="adm-stat-label">Yanıt bekleyen şikâyet</span>
            <span className="adm-stat-icon"><AdminIcon name="alert" size={16} /></span>
          </div>
          <span className="adm-stat-value">{waiting}</span>
          <span className="adm-stat-hint">1-3 yıldız, çözülmedi</span>
        </div>
      </section>

      <section className="adm-section" aria-labelledby="geri-bildirim-listesi">
        <div className="adm-section-head">
          <h2 id="geri-bildirim-listesi">Mesajlar</h2>
          <nav className="adm-chips" aria-label="Geri bildirimleri filtrele">
            {FILTERS.map((item) => (
              <a
                key={item.value}
                className={`adm-chip ${filter === item.value ? "is-active" : ""}`}
                href={item.value === "tumu" ? "/admin/geri-bildirim" : `/admin/geri-bildirim?durum=${item.value}`}
                aria-current={filter === item.value ? "page" : undefined}
              >
                {item.label} <b>{counts[item.value]}</b>
              </a>
            ))}
          </nav>
        </div>

        {shown.length === 0 ? (
          <div className="adm-empty">
            <span className="adm-empty-icon"><AdminIcon name="star" /></span>
            <strong>{list.length === 0 ? "Henüz geri bildirim yok" : "Bu filtrede geri bildirim yok"}</strong>
            <p>
              Misafirler menüdeki ya da ana sayfadaki &quot;Bizi değerlendirin&quot; bağlantısından puan
              verdiğinde burada görünür.
            </p>
          </div>
        ) : (
          <div className="adm-reviews">
            {shown.map((item) => {
              const complaint = item.rating <= 3;
              return (
                <article
                  key={item.id}
                  className={`adm-card adm-review ${complaint && !item.is_resolved ? "adm-fb-open" : ""}`}
                >
                  <div className="adm-review-head">
                    <span className="adm-review-avatar">{item.rating}</span>
                    <span className="adm-row-main">
                      <strong>{complaint ? "Şikâyet" : "Memnun misafir"}</strong>
                      <small>{formatDate(item.created_at)}</small>
                    </span>
                    <span className="adm-stars" aria-label={`${item.rating} yıldız`}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <AdminIcon key={star} name="star" size={14} strokeWidth={star <= item.rating ? 0 : 1.6} />
                      ))}
                    </span>
                  </div>

                  {item.comment ? (
                    <p className="adm-review-text">{item.comment}</p>
                  ) : (
                    <p className="adm-review-text adm-muted">Mesaj bırakılmadı.</p>
                  )}

                  {item.contact && (
                    <p className="adm-fb-contact">
                      <AdminIcon name="phone" size={14} />
                      {item.contact}
                    </p>
                  )}

                  <div className="adm-review-foot">
                    <span className="adm-fb-badges">
                      {item.went_to_google && <span className="adm-badge s-ok">Google&apos;a yönlendi</span>}
                      {complaint && (
                        <span className={`adm-badge is-dot ${item.is_resolved ? "s-delivered" : "s-pending"}`}>
                          {item.is_resolved ? "Çözüldü" : "Yanıt bekliyor"}
                        </span>
                      )}
                    </span>
                    {complaint && (
                      <form action={setFeedbackResolved}>
                        <input type="hidden" name="id" value={item.id} />
                        <input type="hidden" name="resolved" value={item.is_resolved ? "0" : "1"} />
                        <button type="submit" className="adm-btn adm-btn-sm">
                          <AdminIcon name={item.is_resolved ? "refresh" : "check"} size={14} />
                          {item.is_resolved ? "Yeniden aç" : "Çözüldü olarak işaretle"}
                        </button>
                      </form>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
