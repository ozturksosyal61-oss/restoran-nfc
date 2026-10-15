import type { SupabaseClient } from "@supabase/supabase-js";
import { loadFeedback, loadMenuStats, loadSalesReport, type MenuStats, type SalesReport } from "../app/admin/raporlar/data";
import { escapeHtml, type EmailMessage } from "./email";
import { hasPlanFeature } from "./plan";
import { buildInsights, type FeedbackSummary, type Insight } from "./report-insights";
import { percentChange, resolveSummary, type SummaryPeriod } from "./report-periods";
import { SITE_URL } from "./site";

// Haftalık rapor e-postası: geçen haftanın (pazartesi–pazar) özeti.
// Rakamlar ve "öne çıkanlar" paneldeki Dönem özeti ile aynı kaynaktan gelir.

export type WeeklyReportRestaurant = {
  id: number;
  name: string;
  plan: string | null;
  menu_only: boolean | null;
  report_unsubscribe_token: string;
};

export type WeeklyReport = {
  restaurant: WeeklyReportRestaurant;
  period: SummaryPeriod;
  showSales: boolean;
  sales: SalesReport | null;
  previousSales: SalesReport | null;
  menu: MenuStats | null;
  previousMenu: MenuStats | null;
  feedback: FeedbackSummary | null;
  insights: Insight[];
};

export async function loadWeeklyReport(
  supabase: SupabaseClient,
  restaurant: WeeklyReportRestaurant,
  now = new Date()
): Promise<WeeklyReport> {
  // Son tamamlanan hafta.
  const period = resolveSummary("hafta", undefined, now);
  const showSales = restaurant.menu_only !== true && hasPlanFeature(restaurant.plan, "analytics");

  const [sales, previousSales, menu, previousMenu, feedback] = await Promise.all([
    showSales ? loadSalesReport(supabase, restaurant.id, period.from, period.to) : Promise.resolve(null),
    showSales ? loadSalesReport(supabase, restaurant.id, period.previous.from, period.previous.to) : Promise.resolve(null),
    loadMenuStats(supabase, restaurant.id, period.from, period.to),
    loadMenuStats(supabase, restaurant.id, period.previous.from, period.previous.to),
    loadFeedback(supabase, restaurant.id, period.from, period.to),
  ]);

  const insights = buildInsights({ kind: "hafta", sales, previousSales, menu, previousMenu, feedback });

  return { restaurant, period, showSales, sales, previousSales, menu, previousMenu, feedback, insights };
}

// Haftada hiçbir şey olmadıysa e-posta gönderilmez.
export function hasActivity(report: WeeklyReport) {
  return (
    Number(report.sales?.orders ?? 0) > 0 ||
    Number(report.menu?.menu_views ?? 0) > 0 ||
    Number(report.feedback?.count ?? 0) > 0
  );
}

// E-postadaki bağlantı (onay sayfası).
export function unsubscribeUrl(token: string) {
  return `${SITE_URL}/rapor/birak?t=${encodeURIComponent(token)}`;
}

// E-posta istemcisinin tek tıkla çıkış düğmesi (POST).
export function oneClickUnsubscribeUrl(token: string) {
  return `${SITE_URL}/api/rapor/birak?t=${encodeURIComponent(token)}`;
}

/* ---------------- Biçim ---------------- */

const money = (value: number) => `${Math.round(value).toLocaleString("tr-TR")} ₺`;
const count = (value: number) => Math.round(value).toLocaleString("tr-TR");

function change(current: number, previous: number | null | undefined) {
  if (previous == null) return null;
  const value = percentChange(current, previous);
  if (value === null || Math.round(value) === 0) return null;
  return { up: value > 0, text: `${value > 0 ? "▲" : "▼"} %${Math.abs(Math.round(value)).toLocaleString("tr-TR")}` };
}

function busiestHour(sales: SalesReport | null) {
  const rows = sales?.by_hour ?? [];
  const best = rows.reduce<{ hour: number; orders: number } | null>(
    (top, row) => (Number(row.orders) > Number(top?.orders ?? 0) ? row : top),
    null
  );
  if (!best) return null;
  const pad = (hour: number) => String(hour % 24).padStart(2, "0");
  return `${pad(best.hour)}:00–${pad(best.hour + 1)}:00`;
}

const TONE_MARK: Record<Insight["tone"], string> = { up: "▲", down: "▼", info: "•", tip: "★" };
const TONE_COLOR: Record<Insight["tone"], string> = { up: "#2f7d4f", down: "#b4442c", info: "#6f675a", tip: "#a8792a" };

/* ---------------- E-posta ---------------- */

const C = {
  bg: "#f3efe7",
  card: "#fffdf8",
  ink: "#1c1914",
  muted: "#6f675a",
  line: "#e6dfd1",
  dark: "#16140f",
  gold: "#c9a45c",
};

function stat(label: string, value: string, delta: ReturnType<typeof change>) {
  const deltaHtml = delta
    ? `<div style="margin-top:4px;font-size:12px;font-weight:700;color:${delta.up ? "#2f7d4f" : "#b4442c"}">${escapeHtml(delta.text)}</div>`
    : "";
  return `<td valign="top" style="padding:14px 12px;border:1px solid ${C.line};border-radius:12px;background:${C.card};width:50%">
    <div style="font-size:12px;color:${C.muted}">${escapeHtml(label)}</div>
    <div style="margin-top:4px;font-size:22px;font-weight:700;color:${C.ink}">${escapeHtml(value)}</div>${deltaHtml}
  </td>`;
}

export function renderWeeklyReport(report: WeeklyReport): Pick<EmailMessage, "subject" | "html" | "text"> {
  const { restaurant, period, showSales, sales, previousSales, menu, previousMenu, feedback, insights } = report;
  const name = restaurant.name;
  const panelUrl = `${SITE_URL}/admin/ozet?tur=hafta&donem=${encodeURIComponent(period.key)}`;
  const leaveUrl = unsubscribeUrl(restaurant.report_unsubscribe_token);

  const revenue = Number(sales?.revenue ?? 0);
  const orders = Number(sales?.orders ?? 0);
  const views = Number(menu?.menu_views ?? 0);

  const stats: string[] = [];
  if (showSales && sales) {
    stats.push(stat("Ciro", money(revenue), change(revenue, previousSales ? Number(previousSales.revenue) : null)));
    stats.push(stat("Sipariş", count(orders), change(orders, previousSales ? Number(previousSales.orders) : null)));
  }
  stats.push(stat("Menü görüntülenme", count(views), change(views, previousMenu ? Number(previousMenu.menu_views) : null)));
  if (feedback && feedback.count > 0) {
    stats.push(stat("Ortalama puan", `${feedback.average.toLocaleString("tr-TR", { maximumFractionDigits: 1 })} / 5`, null));
  } else if (menu) {
    stats.push(stat("Ziyaretçi", count(Number(menu.visitors ?? 0)), null));
  }

  const statRows: string[] = [];
  for (let i = 0; i < stats.length; i += 2) {
    statRows.push(
      `<tr>${stats[i]}<td style="width:10px"></td>${stats[i + 1] ?? '<td style="width:50%"></td>'}</tr><tr><td colspan="3" style="height:10px"></td></tr>`
    );
  }

  const top = (sales?.top_products ?? []).slice(0, 3);
  const hour = busiestHour(sales);

  const section = (title: string, body: string) =>
    `<tr><td style="padding:18px 0 6px;font-size:13px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:${C.muted}">${escapeHtml(title)}</td></tr><tr><td>${body}</td></tr>`;

  const insightHtml = insights.length
    ? section(
        "Öne çıkanlar",
        insights
          .map(
            (item) =>
              `<div style="padding:8px 0;border-bottom:1px solid ${C.line};font-size:15px;line-height:1.5;color:${C.ink}"><span style="color:${TONE_COLOR[item.tone]};font-weight:700">${TONE_MARK[item.tone]}</span>&nbsp; ${escapeHtml(item.text)}</div>`
          )
          .join("")
      )
    : "";

  const topHtml =
    showSales && top.length
      ? section(
          "En çok satanlar",
          top
            .map(
              (item, index) =>
                `<div style="padding:8px 0;border-bottom:1px solid ${C.line};font-size:15px;color:${C.ink}">${index + 1}. ${escapeHtml(item.name)} <span style="color:${C.muted}">· ${count(Number(item.quantity))} adet</span></div>`
            )
            .join("") +
            (hour ? `<div style="padding:10px 0 0;font-size:14px;color:${C.muted}">En yoğun saat: <strong style="color:${C.ink}">${hour}</strong></div>` : "")
        )
      : "";

  const html = `<!doctype html>
<html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(name)} · Haftalık rapor</title></head>
<body style="margin:0;padding:0;background:${C.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg}"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
  <tr><td style="padding:22px 22px 20px;border-radius:16px;background:${C.dark};color:#f6f1e6">
    <div style="font-size:12px;letter-spacing:.12em;color:${C.gold}">OZT DIGITAL · HAFTALIK RAPOR</div>
    <div style="margin-top:8px;font-size:24px;font-weight:700">${escapeHtml(name)}</div>
    <div style="margin-top:4px;font-size:14px;color:#c9c1b1">${escapeHtml(period.label)}</div>
  </td></tr>
  <tr><td style="height:16px"></td></tr>
  <tr><td><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${statRows.join("")}</table></td></tr>
  ${insightHtml}
  ${topHtml}
  <tr><td align="center" style="padding:26px 0 8px">
    <a href="${panelUrl}" style="display:inline-block;padding:13px 22px;border-radius:12px;background:${C.dark};color:#ffffff;font-size:15px;font-weight:700;text-decoration:none">Ayrıntılı özeti panelde aç</a>
  </td></tr>
  <tr><td style="padding:18px 4px 0;font-size:12px;line-height:1.6;color:${C.muted};text-align:center">
    Bu e-posta ${escapeHtml(name)} için OZT Digital panelinden her pazartesi gönderilir.<br>
    <a href="${leaveUrl}" style="color:${C.muted}">Haftalık raporu almak istemiyorum</a>
  </td></tr>
</table></td></tr></table></body></html>`;

  const lines = [
    `${name} · Haftalık rapor`,
    period.label,
    "",
    ...(showSales && sales ? [`Ciro: ${money(revenue)}`, `Sipariş: ${count(orders)}`] : []),
    `Menü görüntülenme: ${count(views)}`,
    ...(feedback && feedback.count > 0 ? [`Ortalama puan: ${feedback.average.toFixed(1)} / 5`] : []),
    "",
    ...insights.map((item) => `- ${item.text}`),
    "",
    `Ayrıntılı özet: ${panelUrl}`,
    `Raporu almak istemiyorum: ${leaveUrl}`,
  ];

  const headline =
    showSales && sales && orders > 0
      ? `${money(revenue)} ciro, ${count(orders)} sipariş`
      : `menünüz ${count(views)} kez açıldı`;

  return {
    subject: `${name} · Geçen hafta: ${headline}`,
    html,
    text: lines.join("\n"),
  };
}
