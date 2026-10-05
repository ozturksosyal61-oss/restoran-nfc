import { ImageResponse } from "next/og";
import { SITE_HOST } from "../lib/site";

// Paylaşım görseli (og:image / twitter:image) ve logo: kodla üretilir,
// derlemede bir kez oluşturulup önbelleğe alınır.

export const SHARE_SIZE = { width: 1200, height: 630 };
export const SHARE_ALT = "OZT Digital: restoranlar için QR menü ve NFC dijital menü sistemi";

const INK = "#111111";
const GOLD = "#d9b866";
const CREAM = "#f7f4ee";

function Mark({ size }: { size: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: size * 0.22,
        background: INK,
        border: `${Math.max(2, size * 0.03)}px solid ${GOLD}`,
        color: GOLD,
        fontSize: size * 0.34,
        letterSpacing: size * 0.01,
      }}
    >
      OZT
    </div>
  );
}

export function shareImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          background: `radial-gradient(circle at 85% 15%, rgba(217,184,102,0.28), transparent 45%), ${INK}`,
          color: CREAM,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <Mark size={84} />
          <div style={{ display: "flex", fontSize: 34, letterSpacing: 6, color: GOLD }}>OZT DIGITAL</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div style={{ display: "flex", fontSize: 76, lineHeight: 1.05, letterSpacing: -2, maxWidth: 980 }}>
            QR Menü ve NFC Dijital Menü Sistemi
          </div>
          <div style={{ display: "flex", fontSize: 32, color: "#cfc8bb" }}>
            Masadan sipariş · Garson çağırma · Masadan ödeme · Yönetim paneli
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 28 }}>
          <div style={{ display: "flex", color: GOLD }}>{SITE_HOST}</div>
          <div style={{ display: "flex", color: "#9d968a" }}>Restoran ve kafeler için</div>
        </div>
      </div>
    ),
    SHARE_SIZE
  );
}

export function logoImage(size: number) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: INK,
        }}
      >
        <Mark size={size * 0.86} />
      </div>
    ),
    { width: size, height: size }
  );
}
