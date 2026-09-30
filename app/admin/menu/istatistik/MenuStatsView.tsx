import AdminIcon from "../../AdminIcon";
import { isMenuLanguage, languageMeta } from "../../../../lib/menu-i18n";
import { daysOf, longDayLabel, shortDayLabel, type Period } from "../../../../lib/report-periods";
import { BUSINESS_HOURS, type MenuStats } from "../../raporlar/data";
import { BarChart, count, MissingSetup, PeriodPicker, ShareBars, StatCard } from "../../raporlar/ReportParts";

function languageName(code: string) {
  if (code === "tr") return "Türkçe";
  return isMenuLanguage(code) ? languageMeta(code).turkish : code.toUpperCase();
}

// Menü istatistiklerinin görünümü; veri page.tsx içinde yüklenir.
export default function MenuStatsView({
  period,
  stats,
  previous,
}: {
  period: Period;
  stats: MenuStats | null;
  previous: MenuStats | null;
}) {
  const header = (
    <header className="adm-head">
      <div className="adm-head-text">
        <span className="adm-eyebrow">Menü</span>
        <h1>Menü istatistikleri</h1>
        <p>{period.label}</p>
      </div>
    </header>
  );

  if (!stats) {
    return (
      <main className="adm-page adm-rep">
        {header}
        <PeriodPicker basePath="/admin/menu/istatistik" period={period} />
        <MissingSetup />
      </main>
    );
  }

  const byDay = new Map(stats.by_day.map((row) => [row.day, row]));
  const byHour = new Map(stats.by_hour.map((row) => [row.hour, row]));

  const daySeries = daysOf(period).map((day) => ({
    label: shortDayLabel(day, period.days),
    title: longDayLabel(day),
    value: Number(byDay.get(day)?.views ?? 0),
  }));

  const hourSeries = BUSINESS_HOURS.map((hour) => ({
    label: String(hour).padStart(2, "0"),
    title: `${String(hour).padStart(2, "0")}:00–${String((hour + 1) % 24).padStart(2, "0")}:00`,
    value: Number(byHour.get(hour)?.views ?? 0),
  }));

  const foreignViews = stats.by_language
    .filter((row) => row.language !== "tr")
    .reduce((sum, row) => sum + Number(row.views), 0);

  const bestHour = stats.by_hour.length
    ? stats.by_hour.reduce((best, row) => (row.views > best.views ? row : best))
    : null;

  const trackingSince = stats.first_event
    ? new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Istanbul" }).format(
        new Date(stats.first_event)
      )
    : null;

  return (
    <main className="adm-page adm-rep">
      {header}

      <PeriodPicker basePath="/admin/menu/istatistik" period={period} />

      <p className="adm-hint adm-rep-note">
        <AdminIcon name="info" size={14} />
        {trackingSince
          ? `Veriler ${trackingSince} tarihinden beri toplanıyor. `
          : "Veriler bu özellik açıldıktan sonra toplanmaya başlar. "}
        Aynı kişinin yarım saat içindeki tekrar açılışları bir kez sayılır. Karşılaştırma: {period.previous.label}.
      </p>

      <section className="adm-stats adm-rep-stats" aria-label="Menü özeti">
        <StatCard
          label="Menü açılışı"
          value={count(stats.menu_views)}
          icon="eye"
          current={stats.menu_views}
          previous={previous?.menu_views}
          tone="tone-accent"
        />
        <StatCard
          label="Tekil ziyaretçi"
          value={count(stats.visitors)}
          icon="user"
          current={stats.visitors}
          previous={previous?.visitors}
        />
        <StatCard
          label="Ürün incelemesi"
          value={count(stats.product_views)}
          icon="menu"
          current={stats.product_views}
          previous={previous?.product_views}
          hint="Ürüne dokunup ayrıntısını açanlar"
        />
        <StatCard
          label="Yabancı dilde"
          value={count(foreignViews)}
          icon="globe"
          hint={
            stats.menu_views > 0
              ? `Tüm açılışlar içinde %${Math.round((foreignViews / stats.menu_views) * 100)}`
              : "Menü dilleri sayfasından dil ekleyebilirsiniz"
          }
        />
      </section>

      <section className="adm-card" aria-labelledby="gunluk-acilis">
        <div className="adm-card-head">
          <div>
            <h2 id="gunluk-acilis">{period.days === 1 ? "Saatlere göre açılış" : "Günlük menü açılışı"}</h2>
            <p>
              {bestHour
                ? `En yoğun saat ${String(bestHour.hour).padStart(2, "0")}:00`
                : "Bu dönemde menü açılmadı"}
            </p>
          </div>
        </div>
        <BarChart
          data={period.days === 1 ? hourSeries : daySeries}
          dense={period.days === 1 || daySeries.length > 14}
          labelEvery={period.days === 1 ? 3 : daySeries.length > 14 ? Math.ceil(daySeries.length / 8) : 1}
          format={(value) => count(value)}
          valueLabel={(value) => `${count(value)} açılış`}
          emptyText="Bu dönemde menü açılmadı. Müşterileriniz QR kodu okuttukça burada görünecek."
        />
      </section>

      <div className="adm-grid-2 adm-rep-grid">
        {period.days > 1 && (
          <section className="adm-card" aria-labelledby="saat-acilis">
            <div className="adm-card-head">
              <div>
                <h2 id="saat-acilis">Saatlere göre açılış</h2>
                <p>Menünüze en çok ne zaman bakılıyor?</p>
              </div>
            </div>
            <BarChart
              data={hourSeries}
              dense
              labelEvery={3}
              format={(value) => count(value)}
              valueLabel={(value) => `${count(value)} açılış`}
              emptyText="Bu dönemde menü açılmadı."
            />
          </section>
        )}

        <section className="adm-card" aria-labelledby="dil-dagilim">
          <div className="adm-card-head">
            <div>
              <h2 id="dil-dagilim">Diller</h2>
              <p>Menü hangi dilde okundu?</p>
            </div>
          </div>
          <ShareBars
            rows={stats.by_language.map((row) => ({
              label: languageName(row.language),
              value: Number(row.views),
              display: `${count(row.views)} açılış`,
            }))}
            emptyText="Bu dönemde menü açılmadı."
          />
        </section>
      </div>

      <div className="adm-grid-2 adm-rep-grid">
        <section className="adm-card" aria-labelledby="populer-urun">
          <div className="adm-card-head">
            <div>
              <h2 id="populer-urun">En çok bakılan ürünler</h2>
              <p>Ayrıntısı en çok açılan 20 ürün</p>
            </div>
          </div>
          {stats.top_products.length === 0 ? (
            <p className="adm-hint" style={{ margin: 0 }}>Bu dönemde ürün incelenmedi.</p>
          ) : (
            <div className="adm-table-wrap">
              <table className="adm-table adm-rep-table">
                <thead>
                  <tr>
                    <th scope="col">#</th>
                    <th scope="col">Ürün</th>
                    <th scope="col">Kategori</th>
                    <th scope="col" className="is-num">İnceleme</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.top_products.map((row, index) => (
                    <tr key={`${row.name}-${index}`}>
                      <td className="adm-num">{index + 1}</td>
                      <td>{row.name}</td>
                      <td className="adm-muted">{row.category}</td>
                      <td className="adm-num">{count(row.views)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="adm-card" aria-labelledby="bakilmayan-urun">
          <div className="adm-card-head">
            <div>
              <h2 id="bakilmayan-urun">Hiç incelenmeyen ürünler</h2>
              <p>
                {stats.unseen_count > 0
                  ? `${count(stats.unseen_count)} ürüne bu dönemde hiç dokunulmadı. Fotoğraf ya da açıklama eklemek ilgiyi artırabilir.`
                  : "Menüdeki her ürün en az bir kez incelendi."}
              </p>
            </div>
          </div>
          {stats.unseen_products.length > 0 && (
            <ul className="adm-rep-unseen">
              {stats.unseen_products.map((row, index) => (
                <li key={`${row.name}-${index}`}>
                  <strong>{row.name}</strong>
                  <small>{row.category}</small>
                </li>
              ))}
              {stats.unseen_count > stats.unseen_products.length && (
                <li className="adm-muted">ve {count(stats.unseen_count - stats.unseen_products.length)} ürün daha</li>
              )}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
