"use client";

import { useState } from "react";

type RevenueItem = {
  label: string;
  revenue: number;
};

type Props = {
  weeklyRevenue: RevenueItem[];
  monthlyRevenue: RevenueItem[];
};

const money = (value: number) =>
  `${value.toLocaleString("tr-TR", { maximumFractionDigits: 0 })} ₺`;

// Eksen 4 eşit aralığa bölünür; üst sınır her aralık yuvarlak kalacak
// şekilde 1, 2, 4, 8 × 10ⁿ seçilir. Örnek: 2.890 → 4.000, aralık 1.000.
function niceMax(value: number) {
  if (value <= 0) return 1000;
  const power = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 4, 8, 10].find((m) => m * power >= value) ?? 10;
  return step * power;
}

function compact(value: number) {
  if (value >= 100000) {
    return `${(value / 1000).toLocaleString("tr-TR", { maximumFractionDigits: 0 })}B`;
  }
  return value.toLocaleString("tr-TR", { maximumFractionDigits: 0 });
}

export default function DashboardCharts({ weeklyRevenue, monthlyRevenue }: Props) {
  const [period, setPeriod] = useState<"week" | "month">("week");

  const data = period === "week" ? weeklyRevenue : monthlyRevenue;
  const top = niceMax(Math.max(...data.map((item) => item.revenue), 0));
  const ticks = [top, top * 0.75, top * 0.5, top * 0.25, 0];

  const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0);
  const activeDays = data.filter((item) => item.revenue > 0).length;
  const averageRevenue = activeDays > 0 ? totalRevenue / activeDays : 0;
  const peakIndex = data.reduce(
    (best, item, index) => (item.revenue > (data[best]?.revenue ?? -1) ? index : best),
    0
  );
  const peak = data[peakIndex];
  const hasData = totalRevenue > 0;

  return (
    <section className="adm-card" aria-labelledby="ciro-baslik">
      <div className="adm-card-head">
        <div>
          <h2 id="ciro-baslik">Ciro</h2>
          <p>{period === "week" ? "Son 7 gün" : "Son 30 gün"} · sipariş tarihine göre</p>
        </div>
        <div className="adm-seg" role="tablist" aria-label="Dönem">
          <button
            type="button"
            role="tab"
            aria-selected={period === "week"}
            className={period === "week" ? "is-active" : ""}
            onClick={() => setPeriod("week")}
          >
            7 gün
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={period === "month"}
            className={period === "month" ? "is-active" : ""}
            onClick={() => setPeriod("month")}
          >
            30 gün
          </button>
        </div>
      </div>

      <div className="adm-chart-kpis">
        <div>
          <span>Toplam</span>
          <strong>{money(totalRevenue)}</strong>
        </div>
        <div>
          <span>Satış olan gün ortalaması</span>
          <strong>{money(averageRevenue)}</strong>
        </div>
        <div>
          <span>En yüksek gün</span>
          <strong>{hasData && peak ? peak.label : "—"}</strong>
          {hasData && peak && <small>{money(peak.revenue)}</small>}
        </div>
      </div>

      <div className="adm-chart" data-period={period}>
        <div className="adm-chart-axis" aria-hidden="true">
          {ticks.map((tick) => (
            <span key={tick}>{compact(tick)}</span>
          ))}
        </div>

        <div className="adm-chart-plot">
          <div className="adm-chart-grid" aria-hidden="true">
            {ticks.map((tick) => (
              <span key={tick} />
            ))}
          </div>

          <div className="adm-chart-bars">
            {data.map((item, index) => {
              const isToday = index === data.length - 1;
              const isPeak = hasData && index === peakIndex;
              const height = top > 0 ? (item.revenue / top) * 100 : 0;

              return (
                <div
                  key={`${item.label}-${index}`}
                  className="adm-chart-col"
                  title={`${item.label}: ${money(item.revenue)}`}
                >
                  <span
                    className={`adm-chart-bar ${isToday ? "is-today" : ""} ${isPeak ? "is-peak" : ""}`}
                    style={{ height: `${Math.max(height, item.revenue > 0 ? 2 : 0)}%` }}
                  />
                  <span className="adm-chart-label">
                    {period === "month" && index % 5 !== 4 && !isToday ? "" : item.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {!hasData && (
        <p className="adm-hint" style={{ margin: 0 }}>
          Bu dönemde henüz ciro oluşmadı. Siparişler geldikçe grafik dolacak.
        </p>
      )}
    </section>
  );
}
