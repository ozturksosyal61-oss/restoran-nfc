// Dönem özetindeki "Öne çıkanlar": rakamlardan kurallarla çıkarılan,
// işletme sahibinin anlayacağı dilde kısa cümleler. Yapay zekâ kullanılmaz.

import { percentChange, WEEKDAY_NAMES } from "./report-periods";

type Sales = {
  revenue: number;
  orders: number;
  by_hour: { hour: number; orders: number }[];
  by_weekday: { weekday: number; revenue: number }[];
  top_products: { name: string; quantity: number }[];
};

type Menu = {
  menu_views: number;
  by_language: { language: string; views: number }[];
  top_products: { name: string; views: number }[];
  unseen_count: number;
};

export type FeedbackSummary = {
  count: number;
  average: number;
  toGoogle: number;
  openComplaints: number;
};

export type Insight = { tone: "up" | "down" | "info" | "tip"; text: string; priority?: number };

// Ekranda en fazla bu kadar cümle gösterilir (önceliğe göre).
const MAX_INSIGHTS = 6;

const money = (value: number) => `${Math.round(value).toLocaleString("tr-TR")} ₺`;
const pct = (value: number) => `%${Math.abs(Math.round(value)).toLocaleString("tr-TR")}`;
const hourLabel = (hour: number) =>
  `${String(hour).padStart(2, "0")}:00–${String((hour + 1) % 24).padStart(2, "0")}:00`;

export function buildInsights({
  kind,
  sales,
  previousSales,
  menu,
  previousMenu,
  feedback,
}: {
  kind: "hafta" | "ay";
  sales: Sales | null;
  previousSales: Sales | null;
  menu: Menu | null;
  previousMenu: Menu | null;
  feedback: FeedbackSummary | null;
}): Insight[] {
  const insights: Insight[] = [];
  const periodWord = kind === "ay" ? "geçen aya" : "geçen haftaya";

  /* ---------------- Satış ---------------- */

  if (sales) {
    if (sales.orders === 0) {
      insights.push({ tone: "info", text: "Bu dönemde sipariş gelmedi.", priority: 1 });
    } else if (previousSales) {
      const change = percentChange(Number(sales.revenue), Number(previousSales.revenue));
      if (change === null) {
        insights.push({ tone: "up", text: `Bu dönemde ${money(sales.revenue)} ciro yaptınız; önceki dönemde ciro yoktu.`, priority: 1 });
      } else if (change >= 5) {
        insights.push({ tone: "up", text: `Ciro ${periodWord} göre ${pct(change)} arttı ve ${money(sales.revenue)} oldu.`, priority: 1 });
      } else if (change <= -5) {
        insights.push({ tone: "down", text: `Ciro ${periodWord} göre ${pct(change)} düştü (${money(sales.revenue)}).`, priority: 1 });
      } else {
        insights.push({ tone: "info", text: `Ciro ${periodWord} göre yaklaşık aynı: ${money(sales.revenue)}.`, priority: 1 });
      }
    }

    const totalWeekday = sales.by_weekday.reduce((sum, row) => sum + Number(row.revenue), 0);
    if (kind === "ay" && totalWeekday > 0 && sales.by_weekday.length >= 3) {
      const best = sales.by_weekday.reduce((a, b) => (Number(b.revenue) > Number(a.revenue) ? b : a));
      insights.push({
        tone: "info",
        text: `En kazançlı gününüz ${WEEKDAY_NAMES[best.weekday - 1]} (cirodaki payı ${pct((Number(best.revenue) / totalWeekday) * 100)}).`,
        priority: 6,
      });
    }

    if (sales.by_hour.length > 0 && sales.orders > 0) {
      const busiest = sales.by_hour.reduce((a, b) => (Number(b.orders) > Number(a.orders) ? b : a));
      insights.push({ tone: "info", text: `En yoğun saatiniz ${hourLabel(busiest.hour)}.`, priority: 7 });
    }

    const topSeller = sales.top_products[0];
    if (topSeller) {
      insights.push({
        tone: "info",
        text: `En çok satan ürün ${topSeller.name} (${Number(topSeller.quantity).toLocaleString("tr-TR")} adet).`,
        priority: 5,
      });
    }

    // Çok incelenen ama az satılan ürün: fiyat ya da sunum sorunu olabilir.
    if (menu && sales.orders > 0) {
      const sellers = new Set(sales.top_products.slice(0, 8).map((row) => row.name.toLocaleLowerCase("tr-TR")));
      const curious = menu.top_products
        .slice(0, 3)
        .find((row) => Number(row.views) >= 10 && !sellers.has(row.name.toLocaleLowerCase("tr-TR")));
      if (curious) {
        insights.push({
          tone: "tip",
          text: `${curious.name} çok inceleniyor ama az satılıyor. Fiyatına, fotoğrafına ya da açıklamasına göz atmaya değer.`,
          priority: 3,
        });
      }
    }

    if (menu && menu.menu_views >= 20 && sales.orders > 0) {
      const conversion = Math.min(100, (sales.orders / menu.menu_views) * 100);
      insights.push({ tone: "info", text: `Menüyü açanlar içinde sipariş verenlerin oranı yaklaşık ${pct(conversion)}.`, priority: 8 });
    }
  }

  /* ---------------- Menü ---------------- */

  if (menu) {
    if (menu.menu_views === 0) {
      insights.push({ tone: "info", text: "Bu dönemde menü açılmadı ya da sayım henüz başlamadı.", priority: 4 });
    } else {
      const change = previousMenu ? percentChange(menu.menu_views, previousMenu.menu_views) : null;
      insights.push({
        tone: change !== null && change <= -10 ? "down" : change !== null && change >= 10 ? "up" : "info",
        text:
          change === null || Math.abs(change) < 10
            ? `Menünüz ${menu.menu_views.toLocaleString("tr-TR")} kez açıldı.`
            : `Menünüz ${menu.menu_views.toLocaleString("tr-TR")} kez açıldı (${periodWord} göre ${change > 0 ? "" : "-"}${pct(change)}).`,
        // Sadece menü restoranında en önemli rakam budur.
        priority: sales ? 4 : 1,
      });

      const foreign = menu.by_language
        .filter((row) => row.language !== "tr")
        .reduce((sum, row) => sum + Number(row.views), 0);
      if (foreign > 0 && (foreign / menu.menu_views) * 100 >= 5) {
        insights.push({
          tone: "info",
          text: `Yabancı dilde açılış oranı ${pct((foreign / menu.menu_views) * 100)}. Çevirilerinizin güncel olduğundan emin olun.`,
          priority: 9,
        });
      }
    }

    if (menu.unseen_count > 0 && menu.menu_views >= 20) {
      insights.push({
        tone: "tip",
        text: `${menu.unseen_count} ürününüze bu dönemde hiç dokunulmadı. Fotoğraf ya da kısa bir açıklama eklemek ilgiyi artırabilir.`,
        priority: 3,
      });
    }
  }

  /* ---------------- Memnuniyet ---------------- */

  if (feedback) {
    if (feedback.openComplaints > 0) {
      insights.push({
        tone: "down",
        text: `${feedback.openComplaints} şikâyet yanıt bekliyor. Geri bildirimler sayfasından görebilirsiniz.`,
        priority: 2,
      });
    }
    if (feedback.toGoogle > 0) {
      insights.push({
        tone: "up",
        text: `${feedback.toGoogle} memnun misafir Google'da yorum yazmak için yönlendirildi.`,
        priority: 6,
      });
    }
  }

  return insights
    .map((insight, index) => ({ insight, index }))
    .sort((a, b) => (a.insight.priority ?? 9) - (b.insight.priority ?? 9) || a.index - b.index)
    .slice(0, MAX_INSIGHTS)
    .map(({ insight }) => insight);
}
