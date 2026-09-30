import { NextResponse, type NextRequest } from "next/server";
import { getAdminRestaurant } from "../../../../lib/admin-restaurant";
import { hasPlanFeature } from "../../../../lib/plan";
import { daysOf, longDayLabel, resolvePeriod } from "../../../../lib/report-periods";
import { loadSalesReport, PAYMENT_LABELS } from "../data";

// Satış raporunu Excel'in doğrudan açabileceği CSV olarak verir
// (Türkçe Excel için noktalı virgül ayırıcı, virgüllü ondalık, UTF-8 BOM).

function cell(value: string | number) {
  const text =
    typeof value === "number"
      ? value.toLocaleString("tr-TR", { maximumFractionDigits: 2, useGrouping: false })
      : value;
  return /[";\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function row(...values: (string | number)[]) {
  return values.map(cell).join(";");
}

export async function GET(request: NextRequest) {
  const admin = await getAdminRestaurant();
  if (!admin) return NextResponse.json({ error: "Oturum bulunamadı." }, { status: 401 });

  const { data: restaurant } = await admin.supabase
    .from("restaurants")
    .select("name, slug, plan")
    .eq("id", admin.restaurantId)
    .maybeSingle();

  if (!hasPlanFeature(restaurant?.plan, "analytics")) {
    return NextResponse.json({ error: "Satış raporları paketinizde yok." }, { status: 403 });
  }

  const search = request.nextUrl.searchParams;
  const period = resolvePeriod({
    donem: search.get("donem") ?? undefined,
    bas: search.get("bas") ?? undefined,
    bit: search.get("bit") ?? undefined,
  });

  const report = await loadSalesReport(admin.supabase, admin.restaurantId, period.from, period.to);
  if (!report) return NextResponse.json({ error: "Rapor hazırlanamadı." }, { status: 500 });

  const byDay = new Map(report.by_day.map((item) => [item.day, item]));

  const lines = [
    row(`${restaurant?.name ?? "Restoran"} satış raporu`),
    row("Dönem", period.label),
    row("Not", "Gün 05:00'te başlar. İptal ve iadeler ciroya dahil değildir."),
    "",
    row("Özet"),
    row("Ciro (TL)", Number(report.revenue)),
    row("Sipariş", Number(report.orders)),
    row("Satılan ürün (adet)", Number(report.items_sold)),
    row("Tahsil edilen (TL)", Number(report.paid_total)),
    row("Ödenmemiş (TL)", Number(report.unpaid_total)),
    row("Kapanan hesap", Number(report.sessions)),
    row("İade (TL)", Number(report.refunded_total)),
    "",
    row("Günlük döküm"),
    row("Tarih", "Gün", "Sipariş", "Ciro (TL)", "Tahsil edilen (TL)"),
    ...daysOf(period).map((day) => {
      const item = byDay.get(day);
      return row(day, longDayLabel(day), Number(item?.orders ?? 0), Number(item?.revenue ?? 0), Number(item?.paid ?? 0));
    }),
    "",
    row("Ödeme yöntemleri"),
    row("Yöntem", "Sipariş", "Tutar (TL)"),
    ...report.by_payment.map((item) => row(PAYMENT_LABELS[item.method] ?? item.method, Number(item.orders), Number(item.revenue))),
    "",
    row("En çok satan ürünler"),
    row("Ürün", "Adet", "Ciro (TL)"),
    ...report.top_products.map((item) => row(item.name, Number(item.quantity), Number(item.revenue))),
    "",
    row("Kategoriler"),
    row("Kategori", "Adet", "Ciro (TL)"),
    ...report.by_category.map((item) => row(item.name, Number(item.quantity), Number(item.revenue))),
  ];

  const fileName = `satis-raporu-${restaurant?.slug ?? "restoran"}-${period.firstDay}_${period.lastDay}.csv`;

  return new NextResponse(`﻿${lines.join("\r\n")}\r\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
