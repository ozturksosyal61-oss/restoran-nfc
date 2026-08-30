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

export default function DashboardCharts({
  weeklyRevenue,
  monthlyRevenue,
}: Props) {
  const [period, setPeriod] = useState<"week" | "month">("week");

  const data =
    period === "week" ? weeklyRevenue : monthlyRevenue;

  const maxRevenue = Math.max(
    ...data.map((item) => item.revenue),
    1
  );

  const totalRevenue = data.reduce(
    (sum, item) => sum + item.revenue,
    0
  );

  const activeDays = data.filter(
    (item) => item.revenue > 0
  ).length;

  const averageRevenue =
    activeDays > 0 ? totalRevenue / activeDays : 0;

  const peakItem = data.reduce<RevenueItem | null>(
    (highest, item) => {
      if (!highest || item.revenue > highest.revenue) {
        return item;
      }

      return highest;
    },
    null
  );

  return (
    <div
      style={{
        background: "white",
        borderRadius: "18px",
        padding: "22px",
        boxShadow: "0 10px 30px rgba(0,0,0,0.05)",
        minWidth: 0,
      }}
    >
      <div
        className="dashboard-section-heading"
        style={{
          marginBottom: "18px",
          display: "flex",
          justifyContent: "space-between",
          gap: "12px",
          alignItems: "flex-start",
          flexWrap: "wrap",
        }}
      >
        <div>
          <span>CİRO ANALİZİ</span>

          <h2>
            {period === "week"
              ? "Son 7 gün"
              : "Son 30 gün"}
          </h2>
        </div>

        <div
          style={{
            display: "flex",
            gap: "5px",
            padding: "4px",
            background: "#f5f3ef",
            borderRadius: "10px",
          }}
        >
          <button
            type="button"
            onClick={() => setPeriod("week")}
            style={{
              border: "none",
              borderRadius: "7px",
              padding: "7px 10px",
              background:
                period === "week"
                  ? "white"
                  : "transparent",
              color: "#222",
              fontWeight: 700,
              cursor: "pointer",
              fontSize: "11px",
            }}
          >
            Haftalık
          </button>

          <button
            type="button"
            onClick={() => setPeriod("month")}
            style={{
              border: "none",
              borderRadius: "7px",
              padding: "7px 10px",
              background:
                period === "month"
                  ? "white"
                  : "transparent",
              color: "#222",
              fontWeight: 700,
              cursor: "pointer",
              fontSize: "11px",
            }}
          >
            Aylık
          </button>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(145px, 1fr))",
          gap: "10px",
          marginBottom: "20px",
        }}
      >
        <div
          style={{
            padding: "13px 14px",
            borderRadius: "12px",
            background: "#faf8f3",
            border: "1px solid #eee7d8",
          }}
        >
          <div
            style={{
              color: "#999",
              fontSize: "9px",
              fontWeight: 800,
              letterSpacing: ".6px",
            }}
          >
            TOPLAM CİRO
          </div>

          <div
            style={{
              marginTop: "5px",
              fontSize: "21px",
              fontWeight: 800,
            }}
          >
            {totalRevenue.toLocaleString("tr-TR")} TL
          </div>
        </div>

        <div
          style={{
            padding: "13px 14px",
            borderRadius: "12px",
            background: "#faf8f3",
            border: "1px solid #eee7d8",
          }}
        >
          <div
            style={{
              color: "#999",
              fontSize: "9px",
              fontWeight: 800,
              letterSpacing: ".6px",
            }}
          >
            AKTİF GÜN ORTALAMASI
          </div>

          <div
            style={{
              marginTop: "5px",
              fontSize: "21px",
              fontWeight: 800,
            }}
          >
            {averageRevenue.toLocaleString(
              "tr-TR",
              {
                maximumFractionDigits: 0,
              }
            )}{" "}
            TL
          </div>
        </div>

        <div
          style={{
            padding: "13px 14px",
            borderRadius: "12px",
            background: "#faf8f3",
            border: "1px solid #eee7d8",
          }}
        >
          <div
            style={{
              color: "#999",
              fontSize: "9px",
              fontWeight: 800,
              letterSpacing: ".6px",
            }}
          >
            EN YÜKSEK GÜN
          </div>

          <div
            style={{
              marginTop: "5px",
              fontSize: "16px",
              fontWeight: 800,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
            title={
              peakItem
                ? `${peakItem.label}: ${peakItem.revenue.toLocaleString(
                    "tr-TR"
                  )} TL`
                : "Henüz veri yok"
            }
          >
            {peakItem?.label || "-"}
          </div>

          <div
            style={{
              marginTop: "2px",
              color: "#999",
              fontSize: "10px",
            }}
          >
            {peakItem
              ? `${peakItem.revenue.toLocaleString(
                  "tr-TR"
                )} TL`
              : "Henüz veri yok"}
          </div>
        </div>
      </div>

      <div
        style={{
          height: "220px",
          display: "flex",
          alignItems: "flex-end",
          gap: period === "week" ? "12px" : "4px",
          padding: "10px 4px 0",
          borderBottom: "1px solid #eee",
          overflowX: "auto",
        }}
      >
        {data.map((item, index) => {
          const height = Math.max(
            (item.revenue / maxRevenue) * 180,
            item.revenue > 0 ? 8 : 3
          );

          return (
            <div
              key={`${item.label}-${index}`}
              style={{
                minWidth:
                  period === "week"
                    ? "34px"
                    : "18px",
                flex:
                  period === "week"
                    ? 1
                    : "0 0 18px",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
                alignItems: "center",
                gap: "7px",
              }}
              title={`${item.label}: ${item.revenue.toLocaleString(
                "tr-TR"
              )} TL`}
            >
              <div
                style={{
                  width: "100%",
                  maxWidth:
                    period === "week"
                      ? "34px"
                      : "16px",
                  height: `${height}px`,
                  background: "#c8941d",
                  borderRadius:
                    "7px 7px 2px 2px",
                  transition:
                    "height 0.25s ease",
                }}
              />

              <span
                style={{
                  color: "#888",
                  fontSize:
                    period === "week"
                      ? "10px"
                      : "8px",
                  whiteSpace: "nowrap",
                }}
              >
                {item.label}
              </span>
            </div>
          );
        })}
      </div>

      <p
        style={{
          margin: "13px 0 0",
          color: "#999",
          fontSize: "11px",
        }}
      >
        Grafik siparişlerin oluşturulma tarihine göre
        hesaplanır. Ortalama yalnızca ciro oluşan günler
        üzerinden hesaplanır.
      </p>
    </div>
  );
}
