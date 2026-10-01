import Link from "next/link";
import AdminIcon, { type AdminIconName } from "../AdminIcon";
import { PERIOD_OPTIONS, percentChange, type Period } from "../../../lib/report-periods";

// Rapor sayfalarının ortak parçaları. Sunucuda çizilir; durum tutmaz.

export const money = (value: number) =>
  `${Number(value || 0).toLocaleString("tr-TR", { maximumFractionDigits: 0 })} ₺`;

export const count = (value: number) => Number(value || 0).toLocaleString("tr-TR");

// Eksen 4 eşit aralığa bölünür; üst sınır yuvarlak seçilir (panel grafiğiyle aynı).
function niceMax(value: number) {
  if (value <= 0) return 4;
  const power = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 4, 8, 10].find((m) => m * power >= value) ?? 10;
  return Math.max(4, step * power);
}

function compact(value: number) {
  if (value >= 100000) return `${(value / 1000).toLocaleString("tr-TR", { maximumFractionDigits: 0 })}B`;
  return value.toLocaleString("tr-TR", { maximumFractionDigits: 0 });
}

/* ---------------- Dönem seçimi ---------------- */

export function PeriodPicker({ basePath, period }: { basePath: string; period: Period }) {
  return (
    <div className="adm-rep-period">
      <nav className="adm-chips" aria-label="Dönem seçin">
        {PERIOD_OPTIONS.map((option) => (
          <Link
            key={option.key}
            href={`${basePath}?donem=${option.key}`}
            className={`adm-chip ${period.key === option.key ? "is-active" : ""}`}
            aria-current={period.key === option.key ? "page" : undefined}
          >
            {option.label}
          </Link>
        ))}
      </nav>

      <form className="adm-rep-custom" action={basePath}>
        <input type="hidden" name="donem" value="ozel" />
        <label className="adm-sr" htmlFor="rapor-bas">Başlangıç</label>
        <input id="rapor-bas" className="adm-input" type="date" name="bas" defaultValue={period.firstDay} required />
        <span aria-hidden="true">–</span>
        <label className="adm-sr" htmlFor="rapor-bit">Bitiş</label>
        <input id="rapor-bit" className="adm-input" type="date" name="bit" defaultValue={period.lastDay} required />
        <button type="submit" className={`adm-btn ${period.key === "ozel" ? "adm-btn-primary" : ""}`}>
          Göster
        </button>
      </form>
    </div>
  );
}

/* ---------------- Özet kartı ---------------- */

export function StatCard({
  label,
  value,
  icon,
  current,
  previous,
  hint,
  tone,
  lowerIsBetter = false,
}: {
  label: string;
  value: string;
  icon: AdminIconName;
  current?: number;
  previous?: number;
  hint?: string;
  tone?: string;
  lowerIsBetter?: boolean;
}) {
  const raw = current !== undefined && previous !== undefined ? percentChange(current, previous) : undefined;
  // %0'a yuvarlanan küçük değişimler nötr gösterilir.
  const change = raw === undefined || raw === null ? raw : Math.round(raw);
  const good = change !== undefined && change !== null && (lowerIsBetter ? change < 0 : change > 0);
  const bad = change !== undefined && change !== null && (lowerIsBetter ? change > 0 : change < 0);

  return (
    <div className={`adm-stat ${tone ?? ""}`}>
      <div className="adm-stat-top">
        <span className="adm-stat-label">{label}</span>
        <span className="adm-stat-icon"><AdminIcon name={icon} size={16} /></span>
      </div>
      <span className="adm-stat-value">{value}</span>
      {change !== undefined && (
        <span className={`adm-rep-change ${good ? "is-up" : bad ? "is-down" : ""}`}>
          {change === null
            ? "önceki dönemde yok"
            : `${change > 0 ? "▲" : change < 0 ? "▼" : "="} %${Math.abs(change).toLocaleString("tr-TR", {
                maximumFractionDigits: 0,
              })} önceki döneme göre`}
        </span>
      )}
      {hint && <span className="adm-stat-hint">{hint}</span>}
    </div>
  );
}

/* ---------------- Sütun grafiği ---------------- */

export function BarChart({
  data,
  format = compact,
  valueLabel = (value: number) => compact(value),
  dense = false,
  labelEvery = 1,
  emptyText,
}: {
  data: { label: string; value: number; title?: string; highlight?: boolean }[];
  format?: (value: number) => string;
  valueLabel?: (value: number) => string;
  dense?: boolean;
  labelEvery?: number;
  emptyText: string;
}) {
  const top = niceMax(Math.max(...data.map((item) => item.value), 0));
  const ticks = [top, top * 0.75, top * 0.5, top * 0.25, 0];
  const hasData = data.some((item) => item.value > 0);
  const peak = hasData ? data.reduce((best, item, index) => (item.value > data[best].value ? index : best), 0) : -1;

  if (!hasData) {
    return <p className="adm-hint" style={{ margin: 0 }}>{emptyText}</p>;
  }

  return (
    <div className="adm-chart" data-period={dense ? "month" : "week"} data-sparse={labelEvery > 1 ? "" : undefined}>
      <div className="adm-chart-axis" aria-hidden="true">
        {ticks.map((tick) => (
          <span key={tick}>{format(tick)}</span>
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
            const height = (item.value / top) * 100;
            return (
              <div
                key={`${item.label}-${index}`}
                className="adm-chart-col"
                title={`${item.title ?? item.label}: ${valueLabel(item.value)}`}
              >
                <span
                  className={`adm-chart-bar ${index === peak ? "is-peak" : ""} ${item.highlight ? "is-today" : ""}`}
                  style={{ height: `${Math.max(height, item.value > 0 ? 2 : 0)}%` }}
                />
                <span className="adm-chart-label">{index % labelEvery === 0 ? item.label : ""}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Yatay dağılım ---------------- */

export function ShareBars({
  rows,
  emptyText,
}: {
  rows: { label: string; value: number; display: string; sub?: string }[];
  emptyText: string;
}) {
  const total = rows.reduce((sum, row) => sum + row.value, 0);

  if (rows.length === 0 || total === 0) {
    return <p className="adm-hint" style={{ margin: 0 }}>{emptyText}</p>;
  }

  return (
    <ul className="adm-rep-share">
      {rows.map((row) => {
        const share = (row.value / total) * 100;
        return (
          <li key={row.label}>
            <div className="adm-rep-share-head">
              <strong>{row.label}</strong>
              <span>
                {row.display}
                <small> · %{share.toLocaleString("tr-TR", { maximumFractionDigits: share < 10 ? 1 : 0 })}</small>
              </span>
            </div>
            <span className="adm-rating-track" aria-hidden="true">
              <span style={{ width: `${share}%` }} />
            </span>
            {row.sub && <small className="adm-rep-share-sub">{row.sub}</small>}
          </li>
        );
      })}
    </ul>
  );
}

export function MissingSetup() {
  return (
    <p className="adm-alert adm-alert-error" role="alert">
      <AdminIcon name="alert" size={16} />
      Raporlar için veritabanı güncellemesi bekleniyor. Lütfen OZT Digital ile iletişime geçin.
    </p>
  );
}
