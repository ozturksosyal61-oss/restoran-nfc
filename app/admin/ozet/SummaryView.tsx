import Link from "next/link";
import AdminIcon, { type AdminIconName } from "../AdminIcon";
import type { FeedbackSummary, Insight } from "../../../lib/report-insights";
import type { SummaryKind, SummaryPeriod } from "../../../lib/report-periods";
import type { MenuStats, SalesReport } from "../raporlar/data";
import { count, money, StatCard } from "../raporlar/ReportParts";
import PrintButton from "./PrintButton";

const INSIGHT_ICONS: Record<Insight["tone"], AdminIconName> = {
  up: "up",
  down: "down",
  info: "info",
  tip: "sparkle",
};

function TopList({
  title,
  rows,
  unit,
  empty,
}: {
  title: string;
  rows: { name: string; value: number }[];
  unit: string;
  empty: string;
}) {
  return (
    <section className="adm-card" aria-label={title}>
      <div className="adm-card-head">
        <div>
          <h2>{title}</h2>
        </div>
      </div>
      {rows.length === 0 ? (
        <p className="adm-hint" style={{ margin: 0 }}>{empty}</p>
      ) : (
        <ol className="adm-sum-top">
          {rows.map((row, index) => (
            <li key={`${row.name}-${index}`}>
              <span className="adm-sum-rank">{index + 1}</span>
              <strong>{row.name}</strong>
              <span className="adm-num">
                {count(row.value)} {unit}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

// Haftalık / aylık özetin görünümü; veri page.tsx içinde yüklenir.
export default function SummaryView({
  restaurantName,
  kind,
  period,
  options,
  showSales,
  salesLocked,
  sales,
  previousSales,
  menu,
  previousMenu,
  feedback,
  insights,
}: {
  restaurantName: string;
  kind: SummaryKind;
  period: SummaryPeriod;
  options: SummaryPeriod[];
  showSales: boolean;
  salesLocked: boolean;
  sales: SalesReport | null;
  previousSales: SalesReport | null;
  menu: MenuStats | null;
  previousMenu: MenuStats | null;
  feedback: FeedbackSummary | null;
  insights: Insight[];
}) {
  const kindWord = kind === "ay" ? "Aylık" : "Haftalık";
  const averageOrder = sales && sales.orders > 0 ? sales.revenue / sales.orders : 0;
  const previousAverage = previousSales && previousSales.orders > 0 ? previousSales.revenue / previousSales.orders : 0;
  const detailQuery = new URLSearchParams({ donem: "ozel", bas: period.firstDay, bit: period.lastDay }).toString();
  const missing = !menu && (!showSales || !sales);

  return (
    <main className="adm-page adm-rep adm-sum">
      <header className="adm-head">
        <div className="adm-head-text">
          <span className="adm-eyebrow">{kindWord} özet · {restaurantName}</span>
          <h1>{period.label}</h1>
          <p>Karşılaştırma: {period.previous.label}</p>
        </div>
        <div className="adm-head-actions adm-no-print">
          {showSales && (
            <Link className="adm-btn" href={`/admin/raporlar?${detailQuery}`}>
              <AdminIcon name="chart" size={16} />
              Detaylı rapor
            </Link>
          )}
          <PrintButton />
        </div>
      </header>

      <div className="adm-sum-controls adm-no-print">
        <nav className="adm-seg" aria-label="Özet türü">
          <Link href="/admin/ozet?tur=hafta" className={kind === "hafta" ? "is-active" : ""} aria-current={kind === "hafta" ? "page" : undefined}>
            Haftalık
          </Link>
          <Link href="/admin/ozet?tur=ay" className={kind === "ay" ? "is-active" : ""} aria-current={kind === "ay" ? "page" : undefined}>
            Aylık
          </Link>
        </nav>

        <form action="/admin/ozet" className="adm-sum-pick">
          <input type="hidden" name="tur" value={kind} />
          <label className="adm-sr" htmlFor="ozet-donem">Dönem</label>
          <select id="ozet-donem" className="adm-select" name="donem" defaultValue={period.key}>
            {options.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
          <button type="submit" className="adm-btn">Göster</button>
        </form>
      </div>

      {missing && (
        <p className="adm-alert adm-alert-error" role="alert">
          <AdminIcon name="alert" size={16} />
          Özet için veritabanı güncellemesi bekleniyor. Lütfen OZT Digital ile iletişime geçin.
        </p>
      )}

      {insights.length > 0 && (
        <section className="adm-card adm-sum-insights" aria-labelledby="one-cikanlar">
          <div className="adm-card-head">
            <div>
              <h2 id="one-cikanlar">Öne çıkanlar</h2>
              <p>Bu dönemin rakamlarından otomatik çıkarıldı.</p>
            </div>
          </div>
          <ul>
            {insights.map((insight) => (
              <li key={insight.text} className={`is-${insight.tone}`}>
                <span className="adm-sum-insight-icon">
                  <AdminIcon name={INSIGHT_ICONS[insight.tone]} size={15} />
                </span>
                {insight.text}
              </li>
            ))}
          </ul>
        </section>
      )}

      {showSales && sales && (
        <section className="adm-section" aria-labelledby="ozet-satis">
          <div className="adm-section-head">
            <h2 id="ozet-satis">Satış</h2>
          </div>
          <div className="adm-stats adm-rep-stats">
            <StatCard label="Ciro" value={money(sales.revenue)} icon="lira" current={sales.revenue} previous={previousSales?.revenue} tone="tone-accent" />
            <StatCard label="Sipariş" value={count(sales.orders)} icon="orders" current={sales.orders} previous={previousSales?.orders} hint={`${count(sales.items_sold)} ürün satıldı`} />
            <StatCard label="Ortalama sipariş" value={money(averageOrder)} icon="bolt" current={averageOrder} previous={previousAverage} />
            <StatCard label="Kapanan hesap" value={count(sales.sessions)} icon="table" current={sales.sessions} previous={previousSales?.sessions} />
            <StatCard
              label="Tahsil edilen"
              value={money(sales.paid_total)}
              icon="wallet"
              tone="tone-ok"
              hint={sales.unpaid_total > 0 ? `${money(sales.unpaid_total)} ödenmedi` : "Bekleyen ödeme yok"}
            />
          </div>
        </section>
      )}

      {salesLocked && (
        <p className="adm-alert adm-alert-info adm-no-print" style={{ margin: 0 }}>
          <AdminIcon name="lock" size={16} />
          Ciro ve sipariş özeti Pro ve Premium paketlerde görünür.
        </p>
      )}

      {menu && (
        <section className="adm-section" aria-labelledby="ozet-menu">
          <div className="adm-section-head">
            <h2 id="ozet-menu">Menü</h2>
          </div>
          <div className="adm-stats adm-rep-stats">
            <StatCard label="Menü açılışı" value={count(menu.menu_views)} icon="eye" current={menu.menu_views} previous={previousMenu?.menu_views} tone="tone-accent" />
            <StatCard label="Tekil ziyaretçi" value={count(menu.visitors)} icon="user" current={menu.visitors} previous={previousMenu?.visitors} />
            <StatCard label="Ürün incelemesi" value={count(menu.product_views)} icon="menu" current={menu.product_views} previous={previousMenu?.product_views} />
            {feedback && (
              <StatCard
                label="Ortalama puan"
                value={feedback.count > 0 ? feedback.average.toLocaleString("tr-TR", { maximumFractionDigits: 1 }) : "—"}
                icon="star"
                hint={`${count(feedback.count)} geri bildirim · ${count(feedback.toGoogle)} Google'a yönlendi`}
              />
            )}
          </div>
        </section>
      )}

      <div className="adm-grid-2 adm-rep-grid">
        {showSales && sales && (
          <TopList
            title="En çok satan ürünler"
            rows={sales.top_products.slice(0, 5).map((row) => ({ name: row.name, value: Number(row.quantity) }))}
            unit="adet"
            empty="Bu dönemde satış yok."
          />
        )}
        {menu && (
          <TopList
            title="En çok incelenen ürünler"
            rows={menu.top_products.slice(0, 5).map((row) => ({ name: row.name, value: Number(row.views) }))}
            unit="inceleme"
            empty="Bu dönemde ürün incelenmedi."
          />
        )}
      </div>

      <p className="adm-hint adm-rep-note">
        <AdminIcon name="info" size={14} />
        Gün sabah 05:00&apos;te başlar. İptal ve iade edilen siparişler ciroya dahil değildir.
        {period.ongoing && " Dönem devam ettiği için rakamlar henüz kesin değil."}
      </p>
    </main>
  );
}
