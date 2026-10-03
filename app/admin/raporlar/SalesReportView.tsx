import AdminIcon from "../AdminIcon";
import {
  daysOf,
  longDayLabel,
  shortDayLabel,
  WEEKDAY_NAMES,
  type Period,
} from "../../../lib/report-periods";
import { BUSINESS_HOURS, PAYMENT_LABELS, type SalesReport } from "./data";
import { BarChart, count, MissingSetup, money, PeriodPicker, ShareBars, StatCard } from "./ReportParts";

// Satış raporunun görünümü; veri page.tsx içinde yüklenir.
export default function SalesReportView({
  period,
  report,
  previous,
  canExport = false,
}: {
  canExport?: boolean;
  period: Period;
  report: SalesReport | null;
  previous: SalesReport | null;
}) {
  const query = new URLSearchParams(
    period.key === "ozel" ? { donem: "ozel", bas: period.firstDay, bit: period.lastDay } : { donem: period.key }
  ).toString();

  const header = (
    <header className="adm-head">
      <div className="adm-head-text">
        <span className="adm-eyebrow">Raporlar</span>
        <h1>Satış raporu</h1>
        <p>{period.label}</p>
      </div>
      {report && canExport && (
        <div className="adm-head-actions">
          <a className="adm-btn" href={`/admin/raporlar/indir?${query}`}>
            <AdminIcon name="download" size={16} />
            Excel&apos;e aktar (CSV)
          </a>
        </div>
      )}
    </header>
  );

  if (!report) {
    return (
      <main className="adm-page adm-rep">
        {header}
        <PeriodPicker basePath="/admin/raporlar" period={period} />
        <MissingSetup />
      </main>
    );
  }

  const averageOrder = report.orders > 0 ? report.revenue / report.orders : 0;
  const previousAverage = previous && previous.orders > 0 ? previous.revenue / previous.orders : 0;
  const averageBill = report.sessions > 0 ? report.session_total / report.sessions : 0;

  /* ---------------- Grafik verileri ---------------- */

  const byDay = new Map(report.by_day.map((row) => [row.day, row]));
  const byHour = new Map(report.by_hour.map((row) => [row.hour, row]));
  const days = daysOf(period);

  // Uzun dönemlerde aylık toplanır.
  const monthly = period.days > 62;
  const revenueSeries = monthly
    ? Object.entries(
        days.reduce<Record<string, number>>((acc, day) => {
          const key = day.slice(0, 7);
          acc[key] = (acc[key] ?? 0) + Number(byDay.get(day)?.revenue ?? 0);
          return acc;
        }, {})
      ).map(([month, value]) => ({
        label: new Intl.DateTimeFormat("tr-TR", { month: "short", year: "2-digit", timeZone: "UTC" }).format(
          new Date(`${month}-15T12:00:00Z`)
        ),
        value,
      }))
    : days.map((day) => ({
        label: shortDayLabel(day, period.days),
        title: longDayLabel(day),
        value: Number(byDay.get(day)?.revenue ?? 0),
      }));

  const hourSeries = BUSINESS_HOURS.map((hour) => ({
    label: String(hour).padStart(2, "0"),
    title: `${String(hour).padStart(2, "0")}:00–${String((hour + 1) % 24).padStart(2, "0")}:00`,
    value: Number(byHour.get(hour)?.orders ?? 0),
  }));

  const weekdayRows = WEEKDAY_NAMES.map((name, index) => {
    const row = report.by_weekday.find((item) => item.weekday === index + 1);
    return { label: name, value: Number(row?.revenue ?? 0), display: money(Number(row?.revenue ?? 0)), sub: `${count(Number(row?.orders ?? 0))} sipariş` };
  });

  const bestHour = report.by_hour.length
    ? report.by_hour.reduce((best, row) => (row.orders > best.orders ? row : best))
    : null;

  return (
    <main className="adm-page adm-rep">
      {header}

      <PeriodPicker basePath="/admin/raporlar" period={period} />

      <p className="adm-hint adm-rep-note">
        <AdminIcon name="info" size={14} />
        Gün sabah 05:00&apos;te başlar; gece yarısından sonraki siparişler o günün cirosuna yazılır. İptal ve iade
        edilen siparişler ciroya dahil değildir. Karşılaştırma: {period.previous.label}.
      </p>

      <section className="adm-stats adm-rep-stats" aria-label="Dönem özeti">
        <StatCard
          label="Ciro"
          value={money(report.revenue)}
          icon="lira"
          current={report.revenue}
          previous={previous?.revenue}
          tone="tone-accent"
        />
        <StatCard
          label="Sipariş"
          value={count(report.orders)}
          icon="orders"
          current={report.orders}
          previous={previous?.orders}
          hint={`${count(report.items_sold)} ürün satıldı`}
        />
        <StatCard
          label="Ortalama sipariş"
          value={money(averageOrder)}
          icon="bolt"
          current={averageOrder}
          previous={previousAverage}
        />
        <StatCard
          label="Kapanan hesap"
          value={count(report.sessions)}
          icon="table"
          current={report.sessions}
          previous={previous?.sessions}
          hint={
            report.sessions > 0
              ? `Ortalama ${money(averageBill)}${report.session_minutes ? ` · ${report.session_minutes} dk` : ""}`
              : "Bu dönemde kapatılan masa hesabı yok"
          }
        />
        <StatCard
          label="Tahsil edilen"
          value={money(report.paid_total)}
          icon="wallet"
          tone="tone-ok"
          hint={report.unpaid_total > 0 ? `${money(report.unpaid_total)} henüz ödenmedi` : "Bekleyen ödeme yok"}
        />
      </section>

      {(report.refunded_count > 0 || report.cancelled_count > 0) && (
        <p className="adm-alert adm-alert-info" style={{ margin: 0 }}>
          <AdminIcon name="info" size={16} />
          Bu dönemde {report.refunded_count > 0 && `${report.refunded_count} iade (${money(report.refunded_total)})`}
          {report.refunded_count > 0 && report.cancelled_count > 0 && " ve "}
          {report.cancelled_count > 0 && `${report.cancelled_count} iptal`} var; ciroya dahil edilmedi.
        </p>
      )}

      <section className="adm-card" aria-labelledby="ciro-grafik">
        <div className="adm-card-head">
          <div>
            <h2 id="ciro-grafik">{period.days === 1 ? "Saatlere göre sipariş" : monthly ? "Aylık ciro" : "Günlük ciro"}</h2>
            <p>
              {period.days === 1
                ? bestHour
                  ? `En yoğun saat ${String(bestHour.hour).padStart(2, "0")}:00 (${count(bestHour.orders)} sipariş)`
                  : "Bu gün henüz sipariş yok"
                : `Toplam ${money(report.revenue)}`}
            </p>
          </div>
        </div>
        {period.days === 1 ? (
          <BarChart
            data={hourSeries}
            dense
            labelEvery={3}
            format={(value) => count(value)}
            valueLabel={(value) => `${count(value)} sipariş`}
            emptyText="Bu dönemde sipariş yok."
          />
        ) : (
          <BarChart
            data={revenueSeries}
            dense={revenueSeries.length > 14}
            labelEvery={revenueSeries.length > 14 ? Math.ceil(revenueSeries.length / 8) : 1}
            valueLabel={money}
            emptyText="Bu dönemde ciro oluşmadı."
          />
        )}
      </section>

      <div className="adm-grid-2 adm-rep-grid">
        {period.days > 1 && (
          <section className="adm-card" aria-labelledby="saat-grafik">
            <div className="adm-card-head">
              <div>
                <h2 id="saat-grafik">Saatlere göre sipariş</h2>
                <p>
                  {bestHour
                    ? `En yoğun saat ${String(bestHour.hour).padStart(2, "0")}:00`
                    : "Bu dönemde sipariş yok"}
                </p>
              </div>
            </div>
            <BarChart
              data={hourSeries}
              dense
              labelEvery={3}
              format={(value) => count(value)}
              valueLabel={(value) => `${count(value)} sipariş`}
              emptyText="Bu dönemde sipariş yok."
            />
          </section>
        )}

        <section className="adm-card" aria-labelledby="odeme-dagilim">
          <div className="adm-card-head">
            <div>
              <h2 id="odeme-dagilim">Ödeme yöntemleri</h2>
              <p>Ödendi olarak işaretlenen siparişler</p>
            </div>
          </div>
          <ShareBars
            rows={report.by_payment.map((row) => ({
              label: PAYMENT_LABELS[row.method] ?? row.method,
              value: Number(row.revenue),
              display: money(Number(row.revenue)),
              sub: `${count(row.orders)} sipariş`,
            }))}
            emptyText="Bu dönemde tahsil edilmiş ödeme yok."
          />
        </section>

        {period.days >= 7 && (
          <section className="adm-card" aria-labelledby="gun-dagilim">
            <div className="adm-card-head">
              <div>
                <h2 id="gun-dagilim">Haftanın günleri</h2>
                <p>Hangi gün daha çok satıyorsunuz?</p>
              </div>
            </div>
            <ShareBars rows={weekdayRows} emptyText="Bu dönemde ciro oluşmadı." />
          </section>
        )}


        <section className="adm-card" aria-labelledby="kategori-dagilim">
          <div className="adm-card-head">
            <div>
              <h2 id="kategori-dagilim">Kategoriler</h2>
              <p>Cironun kategorilere dağılımı</p>
            </div>
          </div>
          <ShareBars
            rows={report.by_category.map((row) => ({
              label: row.name,
              value: Number(row.revenue),
              display: money(Number(row.revenue)),
              sub: `${count(row.quantity)} adet`,
            }))}
            emptyText="Bu dönemde satış yok."
          />
        </section>
      </div>

      <div className="adm-grid-2 adm-rep-grid">
        <section className="adm-card" aria-labelledby="urun-tablo">
          <div className="adm-card-head">
            <div>
              <h2 id="urun-tablo">En çok satan ürünler</h2>
              <p>Adede göre ilk 20</p>
            </div>
          </div>
          {report.top_products.length === 0 ? (
            <p className="adm-hint" style={{ margin: 0 }}>Bu dönemde satış yok.</p>
          ) : (
            <div className="adm-table-wrap">
              <table className="adm-table adm-rep-table">
                <thead>
                  <tr>
                    <th scope="col">#</th>
                    <th scope="col">Ürün</th>
                    <th scope="col" className="is-num">Adet</th>
                    <th scope="col" className="is-num">Ciro</th>
                  </tr>
                </thead>
                <tbody>
                  {report.top_products.map((row, index) => (
                    <tr key={`${row.name}-${index}`}>
                      <td className="adm-num">{index + 1}</td>
                      <td>{row.name}</td>
                      <td className="adm-num">{count(row.quantity)}</td>
                      <td className="adm-num">{money(Number(row.revenue))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="adm-card" aria-labelledby="masa-dagilim">
          <div className="adm-card-head">
            <div>
              <h2 id="masa-dagilim">Masalar</h2>
              <p>En çok ciro yapan 15 masa</p>
            </div>
          </div>
          <ShareBars
            rows={report.by_table.map((row) => ({
              label: `Masa ${row.table}`,
              value: Number(row.revenue),
              display: money(Number(row.revenue)),
              sub: `${count(row.orders)} sipariş`,
            }))}
            emptyText="Bu dönemde masa siparişi yok."
          />
        </section>
      </div>

      {period.days > 1 && (
        <section className="adm-card" aria-labelledby="gunluk-dokum">
          <div className="adm-card-head">
            <div>
              <h2 id="gunluk-dokum">Günlük döküm</h2>
              <p>Her iş gününün sipariş, ciro ve tahsilatı</p>
            </div>
          </div>
          <div className="adm-table-wrap">
            <table className="adm-table adm-rep-table">
              <thead>
                <tr>
                  <th scope="col">Gün</th>
                  <th scope="col" className="is-num">Sipariş</th>
                  <th scope="col" className="is-num">Ciro</th>
                  <th scope="col" className="is-num">Tahsil edilen</th>
                  <th scope="col" className="is-num">Ortalama</th>
                </tr>
              </thead>
              <tbody>
                {[...days].reverse().map((day) => {
                  const row = byDay.get(day);
                  const revenue = Number(row?.revenue ?? 0);
                  const orders = Number(row?.orders ?? 0);
                  return (
                    <tr key={day} className={orders === 0 ? "is-empty" : ""}>
                      <td>{longDayLabel(day)}</td>
                      <td className="adm-num">{count(orders)}</td>
                      <td className="adm-num">{money(revenue)}</td>
                      <td className="adm-num">{money(Number(row?.paid ?? 0))}</td>
                      <td className="adm-num">{orders > 0 ? money(revenue / orders) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row">Toplam</th>
                  <td className="adm-num">{count(report.orders)}</td>
                  <td className="adm-num">{money(report.revenue)}</td>
                  <td className="adm-num">{money(report.paid_total)}</td>
                  <td className="adm-num">{money(averageOrder)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}
